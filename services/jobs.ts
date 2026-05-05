import api from "./api";
import * as Crypto from "expo-crypto";
import type { JobResponse, CreateJobRequest, PageResponse } from "@/types/api";

/**
 * Create a generation job.
 *
 * The backend dedupes on `idempotencyKey` (UNIQUE constraint on
 * {@code jobs.idempotency_key}). Callers SHOULD persist the key for the
 * lifetime of one logical "generate intent" — i.e. the user pressed
 * Generate once. Network retries, double-tap races, and React re-render
 * effects then resolve to the same Job entity instead of creating
 * duplicate rows that each reserve credits.
 *
 * If the caller does not supply a key (legacy callers, ad-hoc scripts),
 * we still mint one here so the backend contract is never violated.
 * New code should always pass a stable key — see
 * {@code app/(tabs)/studio/review.tsx} for the canonical pattern.
 */
export async function createJob(
    request: CreateJobRequest,
    idempotencyKey?: string,
): Promise<JobResponse> {
    const { data } = await api.post<JobResponse>("/api/jobs", {
        ...request,
        idempotencyKey: idempotencyKey ?? Crypto.randomUUID(),
    });
    return data;
}

/**
 * Generate a variation of a completed job (V20 / Pricing Strategy V2).
 * Inherits source job's room/style/palette/mode — server only nudges
 * seed and prompt_strength per the chosen Subtle/Bold/Wild preset.
 * Costs 1 credit. Idempotent on (sourceJobId, strength) by default;
 * client may pass an explicit key for stricter retry semantics
 * (mint with {@link Crypto.randomUUID}).
 */
export type VariationStrength = "SUBTLE" | "BOLD" | "WILD";

export async function createVariation(
    sourceJobId: string,
    strength: VariationStrength,
    idempotencyKey?: string,
): Promise<JobResponse> {
    const { data } = await api.post<JobResponse>(
        `/api/jobs/${sourceJobId}/variation`,
        {
            strength,
            idempotencyKey: idempotencyKey ?? Crypto.randomUUID(),
        },
    );
    return data;
}

export async function getJob(jobId: string): Promise<JobResponse> {
    const { data } = await api.get<JobResponse>(`/api/jobs/${jobId}`);
    return data;
}

export async function listJobs(page = 0, size = 20): Promise<PageResponse<JobResponse>> {
    const { data } = await api.get<PageResponse<JobResponse>>("/api/jobs", {
        params: { page, size },
    });
    return data;
}

export async function cancelJob(jobId: string): Promise<void> {
    await api.post(`/api/jobs/${jobId}/cancel`);
}

/**
 * Upscale a completed job's output. Backend creates a new child JobEntity
 * (linked via parentJobId), reserves credits, and returns the new job in
 * PENDING state. Mobile should then poll that new jobId until COMPLETED.
 */
export async function upscaleJob(
    parentJobId: string,
    outputId?: string,
): Promise<JobResponse> {
    const { data } = await api.post<JobResponse>(
        `/api/jobs/${parentJobId}/upscale`,
        null,
        { params: outputId ? { outputId } : undefined },
    );
    return data;
}

/**
 * Record user feedback on a specific generated output.
 * Rating: -1 (dislike), 0 (neutral / clear), 1 (like).
 * Feeds per-tier / per-style quality analytics on the backend.
 */
export async function rateOutput(
    jobId: string,
    outputId: string,
    rating: -1 | 0 | 1,
): Promise<void> {
    await api.patch(`/api/jobs/${jobId}/outputs/${outputId}/rating`, { rating });
}
