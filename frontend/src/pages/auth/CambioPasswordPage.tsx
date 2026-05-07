// frontend/src/pages/auth/CambioPasswordPage.tsx
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

export function CambioPasswordPage() {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);

  const cambia = useMutation({
    mutationFn: (values: { password_vecchia: string; password_nuova: string }) =>
      apiClient.post('/auth/cambia-password', values),
    onSuccess: () => {
      notification.success({ message: 'Password cambiata con successo' });
      if (user) setUser({ ...user, deve_cambiare_password: false });
      navigate('/dashboard');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore';
      notification.error({ message: msg });
    },
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <LockOutlined style={{ fontSize: 40, color: '#185FA5', marginBottom: 8 }} />
          <Title level={3} style={{ margin: 0 }}>Cambio password obbligatorio</Title>
          <Text type="secondary">
            Per motivi di sicurezza devi cambiare la password prima di continuare.
          </Text>
        </div>
        <Form form={form} layout="vertical"
          onFinish={v => cambia.mutate(v)}>
          <Form.Item name="password_vecchia" label="Password attuale"
            rules={[{ required: true, message: 'Inserisci la password attuale' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="password_nuova" label="Nuova password"
            rules={[{ required: true, message: 'Inserisci la nuova password' },
                    { min: 6, message: 'Minimo 6 caratteri' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="password_conferma" label="Conferma nuova password"
            dependencies={['password_nuova']}
            rules={[
              { required: true, message: 'Conferma la nuova password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password_nuova') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Le password non coincidono'));
                },
              }),
            ]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block
            loading={cambia.isPending} style={{ marginTop: 8 }}>
            Cambia password
          </Button>
        </Form>
      </Card>
    </div>
  );
}
