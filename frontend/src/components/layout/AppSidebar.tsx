import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, ProjectOutlined, TeamOutlined,
  FileTextOutlined, BarChartOutlined, SettingOutlined, BankOutlined, ToolOutlined,
  FundOutlined, FormOutlined, AuditOutlined,
} from '@ant-design/icons';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canDo } from '../../utils/rbac';

const { Sider } = Layout;

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useLayoutStore(s => s.sidebarCollapsed);
  const setSidebarCollapsed = useLayoutStore(s => s.setSidebarCollapsed);
  const user = useAuthStore(s => s.user);

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/proposte', icon: <FormOutlined />, label: 'Proposte' },
    { key: '/autorizzazioni', icon: <AuditOutlined />, label: 'Autorizzazioni Spesa' },
    { key: '/progetti', icon: <ProjectOutlined />, label: 'Progetti' },
    { key: '/portfolio', icon: <FundOutlined />, label: 'Portfolio' },
    ...(user && canDo(user.ruolo, 'timesheet:accedi')
      ? [{ key: '/timesheet', icon: <FileTextOutlined />, label: 'Timesheet' }] : []),
    ...(user && canDo(user.ruolo, 'sal:visualizza')
      ? [{ key: '/sal', icon: <BarChartOutlined />, label: 'Rendicontazione' }] : []),
    ...(user && canDo(user.ruolo, 'personale:visualizza')
      ? [{ key: '/personale', icon: <TeamOutlined />, label: 'Personale' }] : []),
    ...(user && canDo(user.ruolo, 'partner:gestisci')
      ? [{ key: '/partner', icon: <BankOutlined />, label: 'Partner / Enti' }] : []),
    ...(user && canDo(user.ruolo, 'configurazione:accedi')
      ? [{ key: '/configurazione', icon: <SettingOutlined />, label: 'In configurazione' }] : []),
    ...(user?.ruolo === 'superadmin'
      ? [{ key: '/admin', icon: <ToolOutlined />, label: 'Amministrazione' }] : []),
  ];

  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key ?? '/dashboard';

  return (
    <Sider collapsible collapsed={collapsed} onCollapse={setSidebarCollapsed} breakpoint="lg"
      style={{ overflow: 'auto', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 16px',
        color: '#fff', fontWeight: 700, fontSize: collapsed ? 18 : 14,
        whiteSpace: 'nowrap', overflow: 'hidden',
      }}>
        {collapsed ? 'GR' : 'Gestionale Ricerca'}
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
}
