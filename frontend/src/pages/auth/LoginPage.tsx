// frontend/src/pages/auth/LoginPage.tsx
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import type { LoginRequest, LoginResponse } from '../../types/auth';
import type { ApiResponse } from '../../types/api';

const { Title, Text } = Typography;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionExpired = searchParams.get('reason') === 'session_expired';

  async function handleSubmit(values: LoginRequest) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', values);
      login(data.data.user, data.data.access_token);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Credenziali non valide. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f5',
    }}>
      <Card style={{ width: 380, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ color: '#185FA5', marginBottom: 4 }}>
            Gestionale Ricerca
          </Title>
          <Text type="secondary">Accedi con le credenziali di ateneo</Text>
        </div>

        {sessionExpired && (
          <Alert
            message="Sessione scaduta"
            description="Effettua nuovamente il login per continuare."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {error && (
          <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
        )}

        <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Inserisci la email' }, { type: 'email' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Inserisci la password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ backgroundColor: '#185FA5' }}
            >
              Accedi
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
