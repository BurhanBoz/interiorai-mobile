import type { CreditLedgerEntry, LedgerType } from "@/types/api";

/**
 * Turns raw ledger rows into the lines billing history actually shows.
 *
 * <p>🔴 <b>Why this file exists.</b> The screen used to render
 * {@code entry.reason} — the server's audit string, English prose with a raw
 * job UUID in it: "Credits reserved for job 7a556623-c9…". That is admin
 * tooling output and it was going straight onto a paying customer's billing
 * page, untranslated, in all ten locales. The backend has shipped a proper
 * localisable {@code description} since B-06
 * ({@code LedgerDescriptionBuilder}); nothing on the client ever read it.
 *
 * <p>The wire format is {@code "<i18nKey>|<param>|<param>"}, e.g.
 * {@code "ledger.reserve_interior_redesign|Living Room|6"}. Rather than
 * shipping one translation per verb×feature pair — three verbs times eight
 * features times two shapes is 48 keys in ten languages for what is really
 * two nouns — we take the key apart and compose the row from names the app
 * already has: the Studio's own mode labels, so billing history calls a
 * feature exactly what the tile that spent the credits called it.
 */

/** What a row says, once the wire format has been taken apart. */
export interface LedgerLine {
    /** Bold line: the feature, or the kind for non-job rows. */
    titleKey: string;
    /** Quiet second line. Null when the title says everything. */
    captionKey: string | null;
    /** Not localised — a room name out of the catalogue, shown verbatim. */
    room: string | null;
    /** Interpolation for `captionKey`, when it takes any. */
    captionParams?: Record<string, string | number>;
}

/**
 * Feature code → the label the rest of the app uses for it.
 *
 * <p>These point at the Studio's own tile copy on purpose. "Don't touch the
 * naming" means billing history has to follow Studio, not invent a parallel
 * vocabulary where INPAINT is "Inpaint" on one screen and "Magic Edit" on
 * another.
 */
const FEATURE_LABEL: Record<string, string> = {
    interior_redesign: "studio.mode_redesign",
    hd_redesign: "credits.ref_hd_redesign",
    inpaint: "studio.mode_inpaint",
    style_transfer: "studio.mode_style_transfer",
    empty_room: "studio.mode_empty_room",
    outdoor_design: "studio.mode_outdoor",
    ultra_hd_upscale: "credits.ref_upscale",
    expand_view: "credits.ledger_feature_expand_view",
};

/** The three job-scoped verbs the builder prefixes a feature onto. */
const JOB_VERBS = ["consume", "reserve", "release"] as const;

/**
 * Splits `"ledger.reserve_interior_redesign|Living Room|6"` into the pieces a
 * row needs. Unknown keys, a null description (rows written before the
 * builder existed) and malformed input all fall through to the ledger type,
 * which is always present — a row never renders blank.
 */
export function parseLedgerLine(entry: CreditLedgerEntry): LedgerLine {
    const raw = entry.description ?? "";
    const [rawKey, ...params] = raw.split("|");
    const key = rawKey.startsWith("ledger.") ? rawKey.slice("ledger.".length) : "";

    if (!key) return fromType(entry.type);

    // Job rows: "<verb>" or "<verb>_<feature>", params [room?, amount].
    const verb = JOB_VERBS.find((v) => key === v || key.startsWith(`${v}_`));
    if (verb) {
        const feature = key.length > verb.length ? key.slice(verb.length + 1) : null;
        // Two params means the design request still had its room type; one
        // means it was deleted, or the row predates the room lookup.
        const room = params.length >= 2 ? params[0] : null;
        return {
            titleKey: (feature && FEATURE_LABEL[feature]) ?? "credits.ledger_feature_generic",
            captionKey: `credits.kind_${verb}`,
            room,
        };
    }

    // "topup_pack|MEDIUM|30|10" — pack code, base credits, bonus credits.
    if (key === "topup_pack") {
        const [, base, bonus] = params;
        const bonusCount = Number(bonus ?? 0);
        return {
            titleKey: "credits.kind_topup",
            captionKey: bonusCount > 0 ? "credits.ledger_pack_bonus" : null,
            room: null,
            captionParams: { base: Number(base ?? 0), bonus: bonusCount },
        };
    }

    const titleKey = `credits.kind_${key}`;
    return { titleKey, captionKey: null, room: null };
}

/** Last resort: name the row after its ledger type. */
function fromType(type: LedgerType): LedgerLine {
    return { titleKey: `credits.kind_${type.toLowerCase()}`, captionKey: null, room: null };
}

/** One line in the list — either a real entry, or a reserve/release pair. */
export interface LedgerRowModel {
    id: string;
    entry: CreditLedgerEntry;
    /** Net credits. Zero on a cancelled job, where reserve and release annul. */
    amount: number;
    /** True when this row stands for a reserve that was given back. */
    refunded: boolean;
    createdAt: string;
    jobId: string | null;
}

/**
 * Collapses the reserve/release churn a failed job leaves behind.
 *
 * <p>A generation that fails writes two rows: −7 when the credits are held
 * and +7 when they come back. Both landed in the list, so three failed jobs
 * read as six entries alternating red and green, none of which cost the user
 * anything. The pair is one event — "this didn't finish, you weren't
 * charged" — and it renders as one row.
 *
 * <p>Zero-amount rows are dropped first: CONSUME writes one purely to flip
 * a reservation's status, and the spend is already on the RESERVE row.
 *
 * <p>Pairing is scoped to the rows currently loaded. The two halves are
 * written seconds apart and the feed is newest-first, so they arrive
 * together; a pair straddling a page boundary simply renders as two ordinary
 * rows, which is still true, just less tidy.
 */
export function buildLedgerRows(entries: CreditLedgerEntry[]): LedgerRowModel[] {
    const meaningful = entries.filter((e) => e.amount !== 0);
    const consumed = new Set<string>();
    const rows: LedgerRowModel[] = [];

    for (let i = 0; i < meaningful.length; i++) {
        const entry = meaningful[i];
        if (consumed.has(entry.id)) continue;

        if (entry.jobId && (entry.type === "RESERVE" || entry.type === "RELEASE")) {
            const mate = meaningful.find(
                (o) =>
                    !consumed.has(o.id) &&
                    o.id !== entry.id &&
                    o.jobId === entry.jobId &&
                    o.amount === -entry.amount &&
                    (o.type === "RESERVE" || o.type === "RELEASE"),
            );
            if (mate) {
                consumed.add(mate.id);
                // Keep the RESERVE as the visible row: it is the one that
                // names the feature and the room.
                const shown = entry.type === "RESERVE" ? entry : mate;
                rows.push({
                    id: shown.id,
                    entry: shown,
                    amount: 0,
                    refunded: true,
                    createdAt: entry.createdAt,
                    jobId: entry.jobId,
                });
                continue;
            }
        }

        rows.push({
            id: entry.id,
            entry,
            amount: entry.amount,
            refunded: false,
            createdAt: entry.createdAt,
            jobId: entry.jobId,
        });
    }

    return rows;
}
