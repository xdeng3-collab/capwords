/**
 * Short labels for what an outfit adds in battle, e.g. ['+10% ATK', '+30 HP'].
 * Takes a config OUTFITS entry; an outfit with no bonus gives an empty list.
 */
export function outfitBonusLabels(outfit) {
  const bonus = outfit?.bonus || {};
  const labels = [];
  if (bonus.attack) labels.push(`+${Math.round(bonus.attack * 100)}% ATK`);
  if (bonus.health) labels.push(`+${bonus.health} HP`);
  if (bonus.rerolls) labels.push(`+${bonus.rerolls} REROLL`);
  if (bonus.crit) labels.push(`${Math.round(bonus.crit * 100)}% CRIT`);
  return labels;
}
