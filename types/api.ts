// ── Enums ──────────────────────────────────────
export type DesignMode = "REDESIGN" | "EMPTY_ROOM" | "INPAINT" | "STYLE_TRANSFER" | "OUTDOOR";
export type QualityTier = "STANDARD" | "HD" | "ULTRA_HD";
export type JobStatus = "PENDING" | "SUBMITTED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type StorageStatus = "PENDING" | "UPLOADED" | "FAILED";
export type FileKind = "INPUT" | "OUTPUT" | "REFERENCE" | "MASK" | "PREVIEW" | "AVATAR";

// ── Auth ───────────────────────────────────────
export interface UserResponse {
    id: string;
    email: string;
    displayName: string;
    status: string;
    createdAt: string;
    /** V53 guest-first — anonymous device account */
    guest?: boolean;
    /** "APPLE" / "GOOGLE" when the provider owns the account; absent otherwise. */
    externalProvider?: string | null;
}

export interface AuthResponse {
    token: string;
    user: UserResponse;
    organizationId: string;
}

// ── Catalog ────────────────────────────────────
export interface CatalogItemResponse {
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    previewUrl: string;
}

// ── Files ──────────────────────────────────────
export interface FileResponse {
    id: string;
    publicUrl: string;
    originalFileName: string;
    contentType: string;
    sizeBytes: number;
    width: number;
    height: number;
    kind: FileKind;
    createdAt: string;
}

// ── Jobs ───────────────────────────────────────
/** Inference speed / quality tradeoff. QUALITY is gated to the MAX plan. */
export type SpeedMode = "FAST" | "BALANCED" | "QUALITY";

/**
 * One finger stroke of the Smart Edit mask, in resolution-independent
 * coordinates: x/y normalized to [0,1] over the image, brush as a fraction
 * of image WIDTH. Rasterized server-side at the photo's original dimensions.
 */
export interface MaskStroke {
    brush: number;
    points: { x: number; y: number }[];
}

/**
 * Smart Edit mask semantics: CHANGE = painted area is repainted (rest
 * preserved); PROTECT = painted area is preserved (rest repainted — the
 * backend inverts the mask).
 */
export type MaskMode = "CHANGE" | "PROTECT";

export interface CreateJobRequest {
    inputFileId: string;
    roomTypeId: string;
    designStyleId: string;
    designMode: DesignMode;
    preserveLayout?: boolean;
    prompt?: string;
    negativePrompt?: string;
    colorPalette?: string;
    numOutputs?: number;
    aspectRatio?: string;
    seed?: number;
    strength?: number;
    guidanceScale?: number;
    targetWidth?: number;
    targetHeight?: number;
    qualityTier?: QualityTier;
    speedMode?: SpeedMode;
    referenceFileId?: string;
    maskFileId?: string;
    /**
     * IO-2 (V58) — "+" tile additions. STYLE extras: Style Transfer only.
     * OBJECT insertions: free-form REDESIGN/OUTDOOR/EMPTY_ROOM (preserve
     * layout off). Max 3 total; each bills +1 credit on the backend.
     */
    extraReferences?: ExtraReferenceInput[];
}

export type ExtraReferenceRole = "STYLE" | "OBJECT";

/**
 * V177 — a reference comes from exactly one source: a photo the user uploaded
 * (fileId) or a catalogue piece (catalogItemId). The backend rejects both or
 * neither, so the union is enforced on the wire, not just here.
 */
export type ExtraReferenceInput = {
    role: ExtraReferenceRole;
    fileId?: string;
    catalogItemId?: string;
    /** Normalised 0-1 box on the room photo; omitted means "you decide". */
    placement?: { x: number; y: number; w: number; h: number };
};

/** Body for POST /api/furniture/items (V178). */
export interface SaveFurnitureInput {
    fileId: string;
    name: string;
    category: string;
    material?: string;
    colourName?: string;
    widthCm?: number;
    depthCm?: number;
    heightCm?: number;
}

/** One pickable piece from GET /api/furniture. */
export interface FurnitureItem {
    id: string;
    code: string;
    category: string;
    name: string;
    imageUrl: string;
    material?: string | null;
    colourName?: string | null;
    colourHex?: string | null;
    widthCm?: number | null;
    depthCm?: number | null;
    heightCm?: number | null;
    /** true when this is the user's own saved piece rather than a curated one. */
    mine: boolean;
}

export interface JobOutputResponse {
    id: string;
    ordinal: number;
    url: string;
    file?: FileResponse;
    storageStatus: StorageStatus;
    width: number;
    height: number;
    mimeType: string;
    fileSize: number;
    seed: number;
    generationTimeMs: number;
}

export interface JobResponse {
    id: string;
    status: JobStatus;
    featureCode: string;
    prompt: string;
    createdAt: string;
    submittedAt: string;
    finishedAt: string;
    errorCode: string;
    errorMessage: string;
    creditsConsumed: number;
    roomTypeName: string;
    designStyleName: string;
    designMode: DesignMode;
    qualityTier: QualityTier;
    strength: number;
    guidanceScale: number;
    parentJobId: string;
    inputFile: FileResponse;
    outputs: JobOutputResponse[];
}

// ── Plans ──────────────────────────────────────
export interface PlanFeatureResponse {
    id: string;
    featureCode: string;
    featureName: string;
    enabled: boolean;
    limitsJson: string;
    /**
     * ai_features.credits_per_use — what the backend charges when
     * plan_credit_rules has no matching row. In production that is every
     * row: the table is empty, so this IS the price.
     */
    creditsPerUse?: number;
}

export interface PlanCreditRuleResponse {
    id: string;
    featureCode: string;
    qualityTier: string;
    numOutputs: number;
    creditCost: number;
    description: string;
}

/**
 * Plan-wide permission bits read from backend `plans.permissions_json`.
 * Boolean keys are populated explicitly per plan; any missing key should be
 * treated by the client as `false` (deny-by-default).
 */
export interface PlanPermissions {
    allow_strength?: boolean;
    allow_seed?: boolean;
    allow_negative_prompt?: boolean;
    allow_custom_prompt?: boolean;
    allow_commercial_spaces?: boolean;
    allow_reference_image?: boolean;
    allow_mask_editing?: boolean;
    // Forward-compat: unknown keys the backend may add later
    [key: string]: boolean | undefined;
}

export interface PlanResponse {
    id: string;
    code: string;
    name: string;
    description: string;
    billingPeriod: string;
    priceCents: number;
    currency: string;
    monthlyCredits: number;
    queuePriority: number;
    watermark: boolean;
    modelTier: string;
    sortOrder: number;
    permissions?: PlanPermissions;
    features: PlanFeatureResponse[];
    creditRules: PlanCreditRuleResponse[];
    /** Bonus % on every credit-pack purchase for this plan. 0 = no bonus. */
    creditPackBonusPct: number;
    /**
     * Apple App Store Connect product ID for this auto-renewable subscription
     * (e.g. `com.roomframeai.subscription.basic`). Null on FREE plan and any
     * tier not yet wired into App Store Connect. Mobile uses this to look up
     * the StoreKit/RevenueCat product before initiating purchase. Backend
     * source of truth: `plans.apple_product_id` column (V19).
     */
    appleProductId?: string | null;
    /** Google Play product ID — populated when Android billing is wired up. */
    googleProductId?: string | null;
    /** Stripe price ID — populated when web billing is added. */
    stripePriceId?: string | null;
}

// ── Subscriptions ──────────────────────────────
export interface SubscriptionResponse {
    id: string;
    planCode: string;
    planName: string;
    status: string;
    monthlyCredits: number;
    modelTier: string;
    queuePriority: number;
    watermark: boolean;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    createdAt: string;
    /** Apple-deferred plan change target — null/absent when none pending. */
    scheduledPlanCode?: string | null;
    /** Apple free-trial end (V72); null when converted or never a trial. */
    trialEndsAt?: string | null;
    /** Server truth: this org has at least one COMPLETED render (2026-09-07). */
    hasGenerated?: boolean | null;
    /** ISO instant when the scheduled change takes effect. */
    scheduledChangeAt?: string | null;
}

// ── Credits ────────────────────────────────────
export interface CreditBalanceResponse {
    walletId: string;
    balance: number;
    currency: string;
    monthlyLimit: number;
    planCode: string;
    planName: string;
    /**
     * V20 / Pricing Strategy V2 — welcome bonus expiry (signup +7 days).
     * ISO-8601 string. Non-null + future = trial active (banner + countdown
     * shown). See {@link welcomeBonusActive} for the server-evaluated flag.
     */
    welcomeBonusExpiresAt?: string | null;
    /** Server-evaluated flag — true while trial expiry is in the future. */
    welcomeBonusActive?: boolean;
    /**
     * True when every design job bills a flat 1 credit for this account — the
     * FREE rate (JobServiceImpl.freeFlatRateApplies). Server-evaluated on
     * purpose: it depends on plan, trial state AND whether a bought pack is
     * still held, and a client that recomputed it would drift.
     */
    flatRateApplies?: boolean;
    /**
     * The plan whose credit rules price this account right now — not always
     * the plan it is on. A welcome-trial user and a FREE account still
     * holding a bought pack are both priced at the paid rate.
     */
    pricingPlanCode?: string;
    /**
     * The credit rules that price this account, already resolved server-side.
     *
     * Sent whole rather than as a plan code to look up: /api/plans is filtered
     * by X-App-Version, and the weekly storefront a 1.5.x client receives has
     * no plan called PRO — it has PRO_WEEKLY. The lookup missed and the app
     * displayed FREE's prices for an account the backend was billing at the
     * paid rate.
     */
    creditRules?: PlanCreditRuleResponse[];
}

// ── Pagination ─────────────────────────────────
export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

// ── Shared ─────────────────────────────────────
export interface MessageResponse {
    message: string;
}

// ── Credit Packs (one-time consumable IAP) ─────
export interface CreditPackResponse {
    id: string;
    code: string;
    name: string;
    description: string | null;
    credits: number;
    bonusCredits: number;
    totalCredits: number;
    priceCents: number;
    currency: string;
    appleProductId: string | null;
    googleProductId: string | null;
    badgeLabel: string | null;
    sortOrder: number;
}

export interface PurchaseCreditPackRequest {
    packCode: string;
    provider: "REVENUECAT" | "DUMMY";
    transactionId: string;
    productId?: string;
    receiptData?: string;
}

export interface CreditPackPurchaseResponse {
    id: string;
    packCode: string;
    creditsGranted: number;
    newBalance: number;
    provider: string;
    providerTransactionId: string;
    status: "PENDING" | "COMPLETED" | "REFUNDED" | "FAILED";
    purchasedAt: string | null;
}

// ── Credit Ledger ──────────────────────────────
/** Mirrors com.frame.backend.roomframe.common.enums.LedgerType. */
export type LedgerType =
    | "RESERVE"
    | "CONSUME"
    | "RELEASE"
    | "TOPUP"
    | "ADJUSTMENT"
    | "REFUND"
    | "PROMO"
    | "MONTHLY_RESET"
    | "WELCOME_BONUS"
    | "DAILY_DRIP"
    | "WEEKLY_BONUS"
    | "TRIAL_EXPIRY"
    | "WEEKLY_RENEWAL";

export interface CreditLedgerEntry {
    id: string;
    type: LedgerType;
    amount: number;
    /**
     * Raw server-side audit string — English prose carrying a job UUID
     * ("Credits reserved for job 7a556623-c9…"). It is admin tooling
     * output, NOT display copy; billing history renders `description`.
     */
    reason: string;
    /**
     * Pipe-delimited i18n key the server builds for us (B-06):
     * {@code "ledger.reserve_interior_redesign|Living Room|6"}. Parsed by
     * {@code utils/ledger.ts}. Null on very old rows written before the
     * builder existed — the parser falls back to the ledger type.
     */
    description: string | null;
    jobId: string | null;
    createdAt: string;
}

// ── Promo ──────────────────────────────────────
export type DiscountType = "FIXED_AMOUNT" | "PERCENTAGE";

export interface PromoRedemptionResponse {
    redemptionId: string;
    campaignName: string;
    discountType: DiscountType;
    discountValue: number;
    creditsAwarded: number;
    message: string;
}

// ── Gallery ────────────────────────────────────
export interface GalleryItem {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string;
    roomTypeCode: string | null;
    designStyleCode: string | null;
    featured: boolean;
    createdAt: string;
}

// ── Notification Preferences ───────────────────
// V20 / Pricing Strategy V2 — replaces the legacy 5-flag shape
// (push/email/renderComplete/promotions/weeklySummary). Backend ALTERed
// the table to add the granular 5-category matrix; legacy columns
// dropped. CRITICAL is implicit always-on, not a flag here.
export interface NotificationPreferences {
    userId: string;
    transactional: boolean;
    engagement: boolean;
    engagementVariations: boolean;
    marketing: boolean;
    marketingOffers: boolean;
    reengagement: boolean;
    timezone: string;
    apnsTokenRegistered: boolean;
}

// ── Request Shapes ─────────────────────────────
export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface UpdateProfileRequest {
    displayName?: string;
    email?: string;
}

export interface RedeemPromoRequest {
    code: string;
}

export interface UpdateNotificationPreferencesRequest {
    transactional?: boolean;
    engagement?: boolean;
    engagementVariations?: boolean;
    marketing?: boolean;
    marketingOffers?: boolean;
    reengagement?: boolean;
    timezone?: string;
}
