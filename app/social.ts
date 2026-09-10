export const FEMALE_RESIDENT_IDS = [0, 2, 10, 12, 20, 22];
export const residentName = (id: number) =>
  ['지은', '서연', '민지', '하린', '유진', '수빈'][
    FEMALE_RESIDENT_IDS.indexOf(id)
  ] || '동네 주민';
export function numberChance(cash: number, charm=0) {
  const balance = Number.isFinite(cash) ? Math.max(0, cash) : 0;
  return Math.min(.95,0.15 + 0.7 * (balance / (balance + 500000)) + Math.max(0,charm)*.004);
}
