// frontend/src/components/layout/AppHeader.tsx
import { useState } from 'react';
import { Layout, Breadcrumb, Avatar, Dropdown, Badge, Space, Typography,
         Popover, List, Tag, Empty, Spin, Button, Modal, Form, Input, App, Alert } from 'antd';
import { UserOutlined, LogoutOutlined, BellOutlined, LockOutlined,
         ClockCircleOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useLayoutStore } from '../../store/useLayoutStore';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import { env } from '../../config/env';
import { passwordRules, SPECIAL_CHARS_LABEL } from '../../utils/passwordRules';

const { Header } = Layout;
const { Text } = Typography;

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  progetti: 'Progetti',
  configurazione: 'In configurazione',
  personale: 'Personale',
  timesheet: 'Timesheet',
  sal: 'Rendicontazione',
};

interface Notifica {
  id: string;
  tipo: 'sal_scadenza' | 'timesheet_pendente' | 'timesheet_approvato' | 'timesheet_rifiutato';
  titolo: string;
  messaggio: string;
  giorni_rimanenti: number | null;
  link: string;
  urgente: boolean;
}

export function AppHeader() {
  const { notification } = App.useApp();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const collapsed = useLayoutStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pannelloAperto, setPannelloAperto] = useState(false);
  const [cambioPasswordAperto, setCambioPasswordAperto] = useState(false);
  const [cambioForm] = Form.useForm();

  const cambiaPassword = useMutation({
    mutationFn: (values: { password_vecchia: string; password_nuova: string }) =>
      apiClient.post('/auth/cambia-password', values),
    onSuccess: () => {
      notification.success({ message: 'Password cambiata con successo' });
      setCambioPasswordAperto(false);
      cambioForm.resetFields();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore';
      notification.error({ message: msg });
    },
  });

  type CacheNotifiche = { data: Notifica[]; meta: { totale: number } };

  const { mutate: segnaLetta } = useMutation({
    mutationFn: (id: string) => apiClient.post(`/notifiche/${id}/letta`, {}),
    onMutate: (id: string) => {
      queryClient.setQueryData<CacheNotifiche>(['notifiche'], old => {
        if (!old) return old;
        const nuova = old.data.filter(n => n.id !== id);
        return { data: nuova, meta: { totale: nuova.length } };
      });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ['notifiche'] }),
  });

  const { mutate: segnaLetteTutte } = useMutation({
    mutationFn: () => apiClient.post('/notifiche/leggi-tutte', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifiche'] }),
    onError: () => queryClient.invalidateQueries({ queryKey: ['notifiche'] }),
  });

  const { data: notifiche, isLoading: loadingNotifiche } = useQuery({
    queryKey: ['notifiche'],
    queryFn: () => apiClient.get<{ data: Notifica[]; meta: { totale: number } }>('/notifiche')
      .then(r => r.data),
    refetchInterval: 60000,
    enabled: !!user && ['ricercatore', 'amministrativo', 'management', 'superadmin', 'direttore_generale'].includes(user.ruolo),
  });

  const totaleNotifiche = notifiche?.meta?.totale ?? 0;
  const lista = notifiche?.data ?? [];

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = BREADCRUMB_MAP[segment] ?? segment;
    return { title: index < pathSegments.length - 1 ? <Link to={path}>{label}</Link> : label };
  });

  const handleLogout = () => {
    queryClient.clear();
    logout();
    window.location.href = '/login';
  };

  const userMenuItems = [
    { key: 'password', icon: <LockOutlined />, label: 'Cambia password', onClick: () => setCambioPasswordAperto(true) },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Esci', onClick: handleLogout },
  ];

  const pannelloNotifiche = (
    <div style={{ width: 360 }}>
      <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', marginBottom: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Text strong>Notifiche</Text>
          {totaleNotifiche > 0 && <Tag color="red">{totaleNotifiche}</Tag>}
        </Space>
        {totaleNotifiche > 0 && (
          <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }}
            onClick={() => segnaLetteTutte()}>
            Segna tutte lette
          </Button>
        )}
      </div>
      {loadingNotifiche ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : lista.length === 0 ? (
        <Empty description="Nessuna notifica" image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '16px 0' }} />
      ) : (
        <List
          size="small"
          dataSource={lista}
          renderItem={(n: Notifica) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '8px 0',
                borderLeft: n.urgente ? '3px solid #ff4d4f' : '3px solid transparent',
                paddingLeft: n.urgente ? 8 : 0 }}
              onClick={() => {
                segnaLetta(n.id);
                setPannelloAperto(false);
                navigate(n.link);
              }}
            >
              <List.Item.Meta
                avatar={
                  n.tipo === 'sal_scadenza'
                    ? <ClockCircleOutlined style={{ fontSize: 18, color: n.urgente ? '#ff4d4f' : '#faad14', marginTop: 4 }} />
                    : n.tipo === 'timesheet_approvato'
                    ? <CheckCircleOutlined style={{ fontSize: 18, color: '#52c41a', marginTop: 4 }} />
                    : n.tipo === 'timesheet_rifiutato'
                    ? <CloseCircleOutlined style={{ fontSize: 18, color: '#ff4d4f', marginTop: 4 }} />
                    : <FileTextOutlined style={{ fontSize: 18, color: '#1677ff', marginTop: 4 }} />
                }
                title={
                  <Space>
                    <Text strong style={{ fontSize: 13 }}>{n.titolo}</Text>
                    {n.urgente && <Tag color="red" style={{ fontSize: 11 }}>Urgente</Tag>}
                    {n.giorni_rimanenti !== null && !n.urgente && (
                      <Tag color="orange" style={{ fontSize: 11 }}>{n.giorni_rimanenti}gg</Tag>
                    )}
                  </Space>
                }
                description={<Text type="secondary" style={{ fontSize: 12 }}>{n.messaggio}</Text>}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <>
    <Header style={{
      background: '#fff', padding: '0 24px', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <Space>
        {collapsed
          ? <MenuUnfoldOutlined onClick={toggleSidebar} style={{ fontSize: 18, cursor: 'pointer' }} />
          : <MenuFoldOutlined onClick={toggleSidebar} style={{ fontSize: 18, cursor: 'pointer' }} />
        }
        <Breadcrumb items={breadcrumbItems} />
      </Space>

      <Space size="middle">
        <Popover
          content={pannelloNotifiche}
          trigger="click"
          placement="bottomRight"
          arrow={false}
          open={pannelloAperto}
          onOpenChange={setPannelloAperto}
        >
          <Badge count={totaleNotifiche} size="small" style={{ cursor: 'pointer' }}>
            <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
          </Badge>
        </Popover>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: '#185FA5' }} />
            <Text>{user?.nome} {user?.cognome}</Text>
          </Space>
        </Dropdown>
      </Space>
    </Header>

    <Modal
      title="Cambia password"
      open={cambioPasswordAperto}
      onCancel={() => { setCambioPasswordAperto(false); cambioForm.resetFields(); }}
      onOk={() => cambioForm.submit()}
      confirmLoading={cambiaPassword.isPending}
      okText="Cambia" cancelText="Annulla"
      width={440}
    >
      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message="Requisiti password"
        description={
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12 }}>
            <li>Almeno 8 caratteri</li>
            <li>Almeno una lettera maiuscola e una minuscola</li>
            <li>Almeno un numero</li>
            <li>Almeno un carattere speciale: <span style={{ fontFamily: 'monospace' }}>{SPECIAL_CHARS_LABEL}</span></li>
          </ul>
        }
      />
      <Form form={cambioForm} layout="vertical" style={{ marginTop: 4 }}
        onFinish={v => cambiaPassword.mutate(v)}>
        <Form.Item name="password_vecchia" label="Password attuale"
          rules={[{ required: true, message: 'Inserisci la password attuale' }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item name="password_nuova" label="Nuova password" rules={passwordRules}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="password_conferma" label="Conferma nuova password"
          dependencies={['password_nuova']}
          rules={[
            { required: true, message: 'Conferma la nuova password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password_nuova') === value) return Promise.resolve();
                return Promise.reject(new Error('Le password non coincidono'));
              },
            }),
          ]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
    </>
  );
}
