import { useEffect, useRef, useCallback } from "react";
import { getJob } from "@/services/jobs";
import type { JobResponse, JobStatus } from "@/types/api";

const TERMINAL_STATUSES: JobStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

/**
 * Default client-side ceiling for any AI generation job. Mirrors the
 * backend's {@code JobPollingService.TIMEOUT_MINUTES} so the UI never claims
 * "still working" after the server has already failed the job — and so the
 * user is never left staring at a spinner indefinitely when something jams
 * (Replicate queue overrun, lost webhook, ngrok drop, …). Founder spec
 * 2026-05-30.
 */
export const DEFAULT_JOB_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Adaptive cadence (P2-10). A flat 3s tick made every generation feel ~1.5s
 * slower than it was: the fast ones finish inside the first interval and then
 * sit there, finished, waiting for a timer. Poll tightly while the user is
 * still watching the progress screen with fresh attention, then back off to
 * the steady rate — completion normally arrives by webhook anyway, so this
 * loop is a fallback, not the primary signal.
 *
 * Cost: ~12 extra requests per job, all of them cheap reads.
 */
const EAGER_INTERVAL_MS = 1200;
const EAGER_WINDOW_MS = 15 * 1000;

/**
 * Poll a job until it terminates or the {@code timeoutMs} ceiling is hit.
 *
 * @param onUpdate  fired on every successful fetch with the latest snapshot
 * @param options.timeoutMs  hard cap (defaults to {@link DEFAULT_JOB_TIMEOUT_MS})
 * @param options.onTimeout  fired ONCE if {@code timeoutMs} elapses with no
 *                           terminal status; lets the screen surface a
 *                           generic "try again" alert and route away.
 *                           Polling is stopped automatically before the
 *                           callback fires.
 */
export function useJobPolling(
    jobId: string | null,
    onUpdate: (job: JobResponse) => void,
    intervalMs = 3000,
    options?: { timeoutMs?: number; onTimeout?: () => void },
) {
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Capture latest callback refs so the timeout closure can't fire a stale
    // onTimeout from an earlier mount.
    const onUpdateRef = useRef(onUpdate);
    const onTimeoutRef = useRef(options?.onTimeout);
    onUpdateRef.current = onUpdate;
    onTimeoutRef.current = options?.onTimeout;

    const stop = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const timeoutMs = options?.timeoutMs ?? DEFAULT_JOB_TIMEOUT_MS;

    useEffect(() => {
        if (!jobId) return;

        const poll = async () => {
            try {
                const job = await getJob(jobId);
                onUpdateRef.current(job);
                if (TERMINAL_STATUSES.includes(job.status)) {
                    stop();
                }
            } catch {
                // continue polling on transient error
            }
        };

        poll();
        // Start eager, then step down once. The step-down replaces the
        // interval rather than layering a second one — two live intervals
        // would double the request rate for the rest of the job.
        const eager = Math.min(EAGER_INTERVAL_MS, intervalMs);
        timerRef.current = setInterval(poll, eager);
        const stepDown = setTimeout(() => {
            if (!timerRef.current) return; // already terminal
            clearInterval(timerRef.current);
            timerRef.current = setInterval(poll, intervalMs);
        }, EAGER_WINDOW_MS);

        timeoutRef.current = setTimeout(() => {
            stop();
            onTimeoutRef.current?.();
        }, timeoutMs);

        return () => {
            clearTimeout(stepDown);
            stop();
        };
    }, [jobId, intervalMs, timeoutMs, stop]);

    return { stop };
}
