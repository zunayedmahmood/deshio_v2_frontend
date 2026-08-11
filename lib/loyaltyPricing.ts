const EPSILON = 0.0000001;

const toNonNegativeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const ceilTaka = (value: unknown): number => {
  const amount = Math.round(toNonNegativeNumber(value) * 100) / 100;
  return amount > 0 ? Math.ceil(amount - EPSILON) : 0;
};

export interface LoyaltyRedemptionInput {
  enabled: boolean;
  requestedPoints: number;
  pointsBalance: number;
  takaPerPoint: number;
  payableBeforeLoyalty: number;
  minimumFinalPayable?: number;
}

export interface LoyaltyRedemptionResult {
  pointsToUse: number;
  maxUsefulPoints: number;
  discountAmount: number;
  finalPayable: number;
}

export const calculateLoyaltyRedemption = ({
  enabled,
  requestedPoints,
  pointsBalance,
  takaPerPoint,
  payableBeforeLoyalty,
  minimumFinalPayable = 0,
}: LoyaltyRedemptionInput): LoyaltyRedemptionResult => {
  const rawPayable = Math.round(toNonNegativeNumber(payableBeforeLoyalty) * 100) / 100;
  const balance = Math.max(0, Math.floor(toNonNegativeNumber(pointsBalance)));
  const rate = toNonNegativeNumber(takaPerPoint);
  const requested = enabled ? Math.max(0, Math.floor(toNonNegativeNumber(requestedPoints))) : 0;
  const minimumPayable = ceilTaka(minimumFinalPayable);
  const roundedWithoutPoints = ceilTaka(rawPayable);

  if (rate <= 0 || balance <= 0 || roundedWithoutPoints <= minimumPayable) {
    return {
      pointsToUse: 0,
      maxUsefulPoints: 0,
      discountAmount: 0,
      finalPayable: roundedWithoutPoints,
    };
  }

  let maxUsefulPoints = Math.max(
    0,
    Math.ceil(((rawPayable - minimumPayable) / rate) - EPSILON)
  );

  const candidateDiscount = Math.round(Math.min(rawPayable, maxUsefulPoints * rate) * 100) / 100;
  const candidateFinal = ceilTaka(rawPayable - candidateDiscount);

  // With a point worth more than Tk 1, the first point that crosses the target
  // can jump below an already-collected amount. Use the greatest safe count.
  if (candidateFinal < minimumPayable) {
    const strictBoundary = (rawPayable - (minimumPayable - 1)) / rate;
    maxUsefulPoints = Math.max(0, Math.ceil(strictBoundary - EPSILON) - 1);
  }

  maxUsefulPoints = Math.min(balance, maxUsefulPoints);
  while (maxUsefulPoints > 0) {
    const safeDiscount = Math.round(Math.min(rawPayable, maxUsefulPoints * rate) * 100) / 100;
    if (ceilTaka(rawPayable - safeDiscount) >= minimumPayable) break;
    maxUsefulPoints -= 1;
  }

  const pointsToUse = Math.min(requested, maxUsefulPoints);
  const discountAmount = Math.round(Math.min(rawPayable, pointsToUse * rate) * 100) / 100;

  return {
    pointsToUse,
    maxUsefulPoints,
    discountAmount,
    finalPayable: ceilTaka(rawPayable - discountAmount),
  };
};
