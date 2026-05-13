import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import type { LoginRequest, LoginResponse } from '../../types/auth';
import type { ApiResponse } from '../../types/api';
import bgLanding from '../../assets/bg_landing.png';

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
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Pannello sinistro: brand ── */}
      <div style={{
        flex: 1,
        backgroundImage: `url(${bgLanding})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: '48px',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: 13,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.75)',
            fontWeight: 700,
            marginBottom: 16,
          }}>
            Portale della Ricerca
          </div>
          <div style={{
            fontSize: 'clamp(2.6rem, 4.5vw, 4rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          }}>
            Gestione<br />Progetti<br />Ricerca
          </div>
        </div>
      </div>

      {/* ── Pannello destro: form ── */}
      <div style={{
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 56px',
        background: '#fff',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 6 }}>
              Accedi
            </div>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              Inserisci le credenziali per continuare
            </div>
          </div>

          {sessionExpired && (
            <Alert
              message="Sessione scaduta"
              description="Effettua nuovamente il login per continuare."
              type="warning"
              showIcon
              style={{ marginBottom: 20 }}
            />
          )}

          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />
          )}

          <Form layout="vertical" onFinish={handleSubmit} autoComplete="off" requiredMark={false}>
            <Form.Item
              label={<span style={{ fontWeight: 500, color: '#374151' }}>Username</span>}
              name="username"
              rules={[{ required: true, message: 'Inserisci lo username' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                placeholder="nome.cognome"
                size="large"
                autoComplete="username"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 500, color: '#374151' }}>Password</span>}
              name="password"
              rules={[{ required: true, message: 'Inserisci la password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="••••••••"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  backgroundColor: '#C5174E',
                  borderColor: '#C5174E',
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 46,
                }}
              >
                Accedi
              </Button>
            </Form.Item>
          </Form>

        </div>
      </div>

    </div>
  );
}
