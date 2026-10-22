/** Compare resolved checks in the order defined by the Contest Procedure (p219). */
export function resolveContest(left, right) {
  for (const [key, reason, direction] of [
    ["hit", "SuccessBeatsFailure", 1], ["special", "SpecialWins", 1],
    ["edge", "EdgeWins", 1], ["bonus", "BonusWins", 1],
    ["penalty", "PenaltyLoses", -1], ["naturalRoll", "NaturalWins", 1]
  ]) {
    const difference = (Number(left[key] ?? 0) - Number(right[key] ?? 0)) * direction;
    if (difference) return { winner: difference > 0 ? "left" : "right", reason };
  }
  return { winner: "draw", reason: "EqualResults" };
}

/** Use the strongest bonus and penalty, then cancel their opposing amounts (p214). */
export function getContestModifiers(values) {
  const modifiers = values.map(value => Number(value ?? 0));
  if (!modifiers.every(Number.isFinite)) throw new Error("Invalid Contest modifiers");
  const modifier = Math.max(0, ...modifiers) + Math.min(0, ...modifiers);
  return { bonus: Math.max(modifier, 0), penalty: Math.max(-modifier, 0) };
}

export function resolveContestDie(naturalRoll, targetValue, { bonus = 0, penalty = 0, edge = false } = {}) {
  const special = naturalRoll !== 20 && naturalRoll === targetValue;
  let bonusApplied = 0;
  let penaltyApplied = 0;
  if (!special && naturalRoll !== 20) {
    bonusApplied = Math.max(-bonus, Math.min(bonus, targetValue - naturalRoll));
    const adjusted = naturalRoll + bonusApplied;
    penaltyApplied = adjusted + penalty > targetValue ? penalty : -penalty;
  }
  const rollTotal = naturalRoll + bonusApplied + penaltyApplied;
  const hit = naturalRoll !== 20 && (special || rollTotal <= targetValue);
  return { naturalRoll, targetValue, special, hit, edge, bonus, penalty, bonusApplied, penaltyApplied, rollTotal };
}
