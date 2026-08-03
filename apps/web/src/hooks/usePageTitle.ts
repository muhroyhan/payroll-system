import { useEffect } from 'react';

// BUGS#17 — the one place document.title gets set; every page composes this
// instead of touching document.title directly, so "Payroll System — X" stays
// a single format.
export function usePageTitle(feature: string | undefined): void {
  useEffect(() => {
    document.title = feature ? `Payroll System — ${feature}` : 'Payroll System — Admin';
  }, [feature]);
}
