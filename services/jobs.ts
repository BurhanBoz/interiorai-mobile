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
