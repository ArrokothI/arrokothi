/**
 * The one exact transform in P01.
 *
 * The hempcrete material-volume estimate has a single right answer for a given wall area and layer
 * thickness, so it is deterministic code and never free-form model arithmetic. It is reached only
 * through the `hempcrete.estimate_volume` capability (see `app.ts`); the capability executor is the
 * only place this function runs at request time.
 *
 *   volume_m3 = area_sq_ft * (thickness_in / 12) * 0.0283168
 *
 * The same function also owns the "obviously invalid dimensions are not valid project inputs" rule:
 * a non-finite, non-positive, or out-of-band value is rejected with an actionable message rather
 * than silently turned into a number.
 */

/** Cubic feet to cubic metres. The task specification pins this constant exactly. */
export const CUBIC_FT_TO_M3 = 0.0283168;
/** Square feet to square metres, for the secondary metric figure only. */
export const SQ_FT_TO_M2 = 0.09290304;

/** Plausible planning band for a single hemp-lime wall/floor area, in square feet. */
export const MIN_AREA_SQ_FT = 1;
export const MAX_AREA_SQ_FT = 100_000;
/** Plausible planning band for a hemp-lime layer/wall thickness, in inches. */
export const MIN_THICKNESS_IN = 0.5;
export const MAX_THICKNESS_IN = 36;

export interface VolumeInput {
  readonly area_sq_ft: number;
  readonly thickness_in: number;
}

export interface VolumeEstimate {
  readonly area_sq_ft: number;
  readonly thickness_in: number;
  /** Primary material figure. */
  readonly volume_m3: number;
  /** Same volume in cubic feet, for readers who think in imperial. */
  readonly volume_ft3: number;
  /** Secondary metric area figure. */
  readonly area_m2: number;
}

export type VolumeResult =
  | { readonly ok: true; readonly estimate: VolumeEstimate }
  | { readonly ok: false; readonly code: string; readonly message: string };

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function checkBand(
  label: string,
  value: unknown,
  min: number,
  max: number,
  unit: string,
): { readonly code: string; readonly message: string } | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { code: "invalid_dimension", message: `${label} must be a number in ${unit}.` };
  }
  if (value <= 0) {
    return { code: "invalid_dimension", message: `${label} must be greater than zero ${unit}.` };
  }
  if (value < min || value > max) {
    return {
      code: "dimension_out_of_range",
      message: `${label} of ${value} ${unit} is outside the ${min}-${max} ${unit} planning range; please double-check it.`,
    };
  }
  return null;
}

/**
 * Deterministically estimate hemp-lime material volume, or explain why the inputs are not usable.
 * Pure: no clock, no randomness, no I/O.
 */
export function estimateHempcreteVolume(input: VolumeInput): VolumeResult {
  const areaIssue = checkBand("Wall area", input.area_sq_ft, MIN_AREA_SQ_FT, MAX_AREA_SQ_FT, "sq ft");
  if (areaIssue) return { ok: false, ...areaIssue };
  const thicknessIssue = checkBand(
    "Layer thickness",
    input.thickness_in,
    MIN_THICKNESS_IN,
    MAX_THICKNESS_IN,
    "in",
  );
  if (thicknessIssue) return { ok: false, ...thicknessIssue };

  const volumeFt3 = input.area_sq_ft * (input.thickness_in / 12);
  const volumeM3 = volumeFt3 * CUBIC_FT_TO_M3;
  return {
    ok: true,
    estimate: {
      area_sq_ft: round(input.area_sq_ft, 2),
      thickness_in: round(input.thickness_in, 2),
      volume_m3: round(volumeM3, 2),
      volume_ft3: round(volumeFt3, 1),
      area_m2: round(input.area_sq_ft * SQ_FT_TO_M2, 1),
    },
  };
}
