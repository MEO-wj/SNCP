type NutritionRefreshReason = 'meals' | 'profile' | 'goals';

type NutritionRefreshListener = (reason: NutritionRefreshReason) => void;

let nutritionRefreshVersion = 0;
const listeners = new Set<NutritionRefreshListener>();

export function subscribeNutritionRefresh(listener: NutritionRefreshListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyNutritionRefresh(reason: NutritionRefreshReason) {
  nutritionRefreshVersion += 1;
  listeners.forEach((listener) => {
    try {
      listener(reason);
    } catch (error) {
      console.error('[NutritionRefresh] listener failed', error);
    }
  });
}

export function getNutritionRefreshVersion() {
  return nutritionRefreshVersion;
}
