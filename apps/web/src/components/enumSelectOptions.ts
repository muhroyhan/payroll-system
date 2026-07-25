import type { StatusTagMeta } from './statusTagTypes';

/** Same exhaustive-Record source that feeds StatusTag — one map per enum
 *  serves both the colored Tag and the form dropdown (R-05, 07_FRONTEND_RULES.md). */
export function enumSelectOptions<E extends string>(
  labels: Record<E, StatusTagMeta>,
): { value: E; label: string }[] {
  return (Object.keys(labels) as E[]).map((key) => ({
    value: key,
    label: labels[key].label,
  }));
}
