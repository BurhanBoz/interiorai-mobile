// ── Enums ──────────────────────────────────────
export type DesignMode = "REDESIGN" | "EMPTY_ROOM" | "INPAINT" | "STYLE_TRANSFER";
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
    referenceFileId?: string;
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
}

export interface PlanCreditRuleResponse {
    id: string;
    featureCode: string;
    qualityTier: string;
    numOutputs: number;
    creditCost: number;
    description: string;
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
    features: PlanFeatureResponse[];
    creditRules: PlanCreditRuleResponse[];
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
}

// ── Credits ────────────────────────────────────
export interface CreditBalanceResponse {
    walletId: string;
    balance: number;
    currency: string;
    monthlyLimit: number;
    planCode: string;
    planName: string;
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

// ── Credit Ledger ──────────────────────────────
export type LedgerType =
    | "RESERVE"
    | "CONSUME"
    | "RELEASE"
    | "TOPUP"
    | "ADJUSTMENT"
    | "REFUND"
    | "PROMO";

export interface CreditLedgerEntry {
    id: string;
    type: LedgerType;
    amount: number;
    reason: string;
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
export interface NotificationPreferences {
    userId: string;
    pushEnabled: boolean;
    emailEnabled: boolean;
    renderComplete: boolean;
    promotions: boolean;
    weeklySummary: boolean;
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
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    renderComplete?: boolean;
    promotions?: boolean;
    weeklySummary?: boolean;
}
