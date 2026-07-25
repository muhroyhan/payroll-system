import { useState } from 'react';
import { Alert, Button, Card, Form, Input } from 'antd';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAuth } from './useAuth';
import { describeApiError, type ApiErrorPresentation } from '../../api/errors';
import { consumeSessionExpiredFlag } from '../../api/session';
import styles from './LoginPage.module.css';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginLocationState {
  from?: Location;
}

// FE-T03 (09_FRONTEND_STEPS.md). Public route — no ProtectedLayout, no
// role check. Uses api/errors.ts (describeApiError) per R-04 — no raw
// error string ever reaches the Alert below.
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<LoginFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiErrorPresentation | null>(null);
  // Read once on mount and cleared immediately — a page reload of /login
  // itself must not keep re-showing the notice (session.ts).
  const [sessionExpired] = useState(() => consumeSessionExpiredFlag());

  const redirectTo =
    (location.state as LoginLocationState | null)?.from?.pathname ?? '/';

  const handleFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(values.email, values.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // 401 here is describeApiError's login-specific branch (kind:'auth',
      // surface:'inline') — wrong credentials, not a session expiring.
      setError(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <Card className={styles.card} title="Payroll System — Admin">
        {sessionExpired && (
          <Alert
            className={styles.alert}
            type="warning"
            showIcon
            message="Sesi berakhir, silakan login kembali."
          />
        )}
        {error && (
          <Alert
            className={styles.alert}
            type="error"
            showIcon
            message={error.title}
          />
        )}
        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          disabled={submitting}
          onFinish={handleFinish}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email wajib diisi' },
              { type: 'email', message: 'Format email tidak valid' },
            ]}
          >
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item
            name="password"
            label="Kata Sandi"
            rules={[{ required: true, message: 'Kata sandi wajib diisi' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item noStyle>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Masuk
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
