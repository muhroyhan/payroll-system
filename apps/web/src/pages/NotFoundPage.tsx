import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

// Catch-all route (router.tsx). Also legitimately reached by clicking a nav
// item whose page hasn't been built yet (routes/access.ts) — see FE-T04's
// note in 09_FRONTEND_STEPS.md.
export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="Halaman tidak ditemukan."
      extra={
        <Link to="/">
          <Button type="primary">Kembali ke Beranda</Button>
        </Link>
      }
    />
  );
}
