import Decimal from "decimal.js";

// Único lugar onde o arredondamento é definido: 2 casas, half-up.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const D = (v: Decimal.Value | null | undefined): Decimal => new Decimal(v ?? 0);
export const round2 = (v: Decimal.Value): Decimal => D(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
export const sum = (values: Decimal.Value[]): Decimal => values.reduce<Decimal>((a, v) => a.plus(D(v)), D(0));
export { Decimal };
