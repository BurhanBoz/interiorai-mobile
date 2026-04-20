import api from "./api";
import * as Crypto from "expo-crypto";
import type { JobResponse, CreateJobRequest, PageResponse } from "@/types/api";

export async function createJob(request: CreateJobRequest): Promise<JobResponse> {
    const { data } = await api.post<JobResponse>("/api/jobs", {
        ...request,
        idempotencyKey: Crypto.randomUUID(),
    });
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
