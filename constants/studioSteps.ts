/**
 * The generation wizard's shape, in one place.
 *
 * <p>Steps used to be four — upload, style, details, then a separate review
 * screen — and each screen carried its own hardcoded label: `step_1_of_4`,
 * `step_2_of_4`, `step_3_of_4`. When review was folded into the details screen
 * the labels stayed behind, so the last step announced itself as "STEP 3 / 4"
 * and the user waited for a fourth that no longer existed (found on device,
 * 2026-09-01).
 *
 * <p>The count now lives here and reaches the screens as an interpolation
 * argument, so a step cannot be added or removed without every label following.
 * The failure this replaces — one number duplicated across four files — cannot
 * recur.
 */
export const STUDIO_STEP_TOTAL = 3;

export const STUDIO_STEP = {
    UPLOAD: 1,
    STYLE: 2,
    DETAILS: 3,
} as const;
