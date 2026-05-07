// frontend/src/components/layout/AppHeader.tsx
import { Layout, Breadcrumb, Avatar, Dropdown, Badge, Space, Typography,
         Popover, List, Tag, Empty, Spin } from 'antd';
import { UserOutlined, LogoutOutlined, BellOutlined,
         ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useLayoutStore } from '../../store/useLayoutStore';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';

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
  tipo: 'sal_scadenza' | 'timesheet_pendente';
  titolo: string;
  messaggio: string;
  giorni_rimanenti: number | null;
  link: string;
  urgente: boolean;
}

export function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const collapsed = useLayoutStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: segnaLetta } = useMutation({
    mutationFn: (id: string) => apiClient.post(`/notifiche/${id}/letta`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifiche'] }),
  });

  const { data: notifiche, isLoading: loadingNotifiche } = useQuery({
    queryKey: ['notifiche'],
    queryFn: () => apiClient.get<{ data: Notifica[]; meta: { totale: number } }>('/notifiche')
      .then(r => r.data),
    refetchInterval: 60000,
    enabled: !!user && ['pi', 'amministrativo', 'management'].includes(user.ruolo),
  });

  const totaleNotifiche = notifiche?.meta?.totale ?? 0;
  const lista = notifiche?.data ?? [];

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = BREADCRUMB_MAP[segment] ?? segment;
    return { title: index < pathSegments.length - 1 ? <Link to={path}>{label}</Link> : label };
  });

  const userMenuItems = [{ key: 'logout', icon: <LogoutOutlined />, label: 'Esci', onClick: logout }];

  const pannelloNotifiche = (
    <div style={{ width: 360 }}>
      <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', marginBottom: 8 }}>
        <Text strong>Notifiche</Text>
        {totaleNotifiche > 0 && (
          <Tag color="red" style={{ marginLeft: 8 }}>{totaleNotifiche}</Tag>
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
                navigate(n.link);
              }}
            >
              <List.Item.Meta
                avatar={
                  n.tipo === 'sal_scadenza'
                    ? <ClockCircleOutlined style={{ fontSize: 18, color: n.urgente ? '#ff4d4f' : '#faad14', marginTop: 4 }} />
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
  );
}
