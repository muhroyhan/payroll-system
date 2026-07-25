import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';

// FE-T01 — router skeleton only. The protected layout, /login, /403, and the
// access-map-driven route guards (R-11, 07_FRONTEND_RULES.md) land in FE-T03/FE-T04;
// this file grows one route per feature task in 09_FRONTEND_STEPS.md.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
]);
