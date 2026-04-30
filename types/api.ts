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
/** Inference speed / quality tradeoff. QUALITY is gated to the MAX plan. */
export type SpeedMode = "FAST" | "BALANCED" | "QUALITY";

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
