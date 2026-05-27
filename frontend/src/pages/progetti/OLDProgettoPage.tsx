// frontend/src/pages/progetti/ProgettoPage.tsx
import { Tabs, Typography, Spin, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { progettiApi } from '../../api/progetti';
import { queryKeys } from '../../utils/queryKeys';
import { StatoBadge } from '../../components/common/StatoBadge';
import { TabGantt } from './tabs/TabGantt';
import { TabBudget } from './tabs/TabBudget';
import { TabSal } from './tabs/TabSal';
import { TabPersonale } from './tabs/TabPersonale';
import { TabDocumenti } from './tabs/TabDocumenti';

const { Title, Text } = Typography;

export function ProgettoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.progetti.detail(id!),
    queryFn: () => progettiApi.get(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!data) return <Text type="danger">Progetto non trovato.</Text>;

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => navigate('/progetti')}>
          Tutti i progetti
        </Button>
      </Space>

      <div style={{ marginBottom: 16 }}>
        <Space align="center" wrap>
          <Title level={2} style={{ margin: 0 }}>{data.acronimo || data.codice}</Title>
          <StatoBadge tipo="progetto" stato={data.stato} />
          <Text type="secondary">{data.tipo}</Text>
        </Space>
        <div style={{ marginTop: 4 }}>
          <Text>{data.titolo}</Text>
        </div>
      </div>

      <Tabs
        defaultActiveKey="gantt"
        items={[
          { key: 'gantt', label: 'Struttura / Gantt', children: <TabGantt progettoId={id!} /> },
          { key: 'budget', label: 'Budget', children: <TabBudget progettoId={id!} /> },
          { key: 'sal', label: 'SAL', children: <TabSal progettoId={id!} /> },
          { key: 'personale', label: 'Personale', children: <TabPersonale progettoId={id!} /> },
          { key: 'documenti', label: 'Documenti', children: <TabDocumenti progettoId={id!} piId={null} /> },
        ]}
      />
    </div>
  );
}
