import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

// R-04/R-11 (07_FRONTEND_RULES.md) — a role failure (403) never logs the
// user out; it lands here instead. Also the target of ProtectedLayout's
// route guard when the logged-in user's role isn't allowed on the current
// path (routes/access.ts).
export function ForbiddenPage() {
  usePageTitle('Akses Ditolak');
  return (
    <Result
      status="403"
      title="403"
      subTitle="Anda tidak punya akses untuk melihat halaman ini."
      extra={
        <Link to="/">
          <Button type="primary">Kembali ke Beranda</Button>
        </Link>
      }
    />
  );
}
