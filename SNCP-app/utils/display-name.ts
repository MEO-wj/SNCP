export const DISPLAY_NAME_MAX_UNITS = 15;

function getDisplayNameCharUnits(char: string) {
  return char.codePointAt(0)! <= 0x7f ? 1 : 2;
}

export function getDisplayNameUnits(value: string) {
  let total = 0;
  for (const char of value) {
    total += getDisplayNameCharUnits(char);
  }
  return total;
}

export function trimDisplayNameToMax(value: string, maxUnits = DISPLAY_NAME_MAX_UNITS) {
  let total = 0;
  let result = '';
  for (const char of value) {
    const nextUnits = getDisplayNameCharUnits(char);
    if (total + nextUnits > maxUnits) {
      break;
    }
    result += char;
    total += nextUnits;
  }
  return result;
}

export function isDisplayNameWithinLimit(value: string, maxUnits = DISPLAY_NAME_MAX_UNITS) {
  return getDisplayNameUnits(value) <= maxUnits;
}
