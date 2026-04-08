import { useEffect, useRef, useCallback } from "react";
import { getJob } from "@/services/jobs";
import type { JobResponse, JobStatus } from "@/types/api";

const TERMINAL_STATUSES: JobStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

export function useJobPolling(
    jobId: string | null,
    onUpdate: (job: JobResponse) => void,
    intervalMs = 3000
) {
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stop = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!jobId) return;

        const poll = async () => {
            try {
                const job = await getJob(jobId);
                onUpdate(job);
                if (TERMINAL_STATUSES.includes(job.status)) {
                    stop();
                }
            } catch {
                // continue polling on transient error
            }
        };

        poll();
        timerRef.current = setInterval(poll, intervalMs);

        return stop;
    }, [jobId, intervalMs]);

    return { stop };
}
