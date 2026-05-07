import { Table, Button, Typography, Row, Col, Tag, Tabs, Popconfirm, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../api/progetti';
import { formatData } from '../../utils/formatters';
import { VociDiCostoPage, TemplateTimesheetPage } from './ConfigurazioneTabella';
import type { Progetto } from '../../types/progetto';

const { Title, Text } = Typography;

export function ConfigurazionePage() {
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['progetti', 'bozze'],
    queryFn: () => progettiApi.listBozze().then(r => r.data.data),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const eliminaProgetto = useMutation({
    mutationFn: (id: string) => progettiApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetti', 'bozze'] });
      notification.success({ message: 'Progetto eliminato' });
    },
    onError: () => notification.error({ message: 'Errore durante l\'eliminazione' }),
  });

  const colonne = [
    { title: 'Codice', dataIndex: 'codice', width: 140 },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Tipo', dataIndex: 'tipo', width: 130 },
    { title: 'Data inizio', dataIndex: 'data_inizio', width: 120, render: formatData },
    { title: 'Stato', width: 90, render: () => <Tag color="default">Bozza</Tag> },
    {
      title: '', width: 160,
      render: (_: unknown, r: Progetto) => (
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8 }}>
          <Button icon={<EditOutlined />} size="small"
            onClick={() => navigate(`/configurazione/${r.id}`)}>
            Continua
          </Button>
          <Popconfirm
            title="Eliminare questo progetto?"
            description="L'operazione e' irreversibile."
            onConfirm={() => eliminaProgetto.mutate(r.id)}
            okText="Elimina"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger type="text" />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const tabProgetti = (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Progetti in configurazione</Title>
          <Text type="secondary">Progetti in stato bozza — non ancora attivati</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => navigate('/configurazione/nuovo')}>
            Nuovo progetto
          </Button>
        </Col>
      </Row>
      <Table columns={colonne} dataSource={data ?? []} rowKey="id" loading={isLoading}
        pagination={false} locale={{ emptyText: 'Nessun progetto in configurazione' }}
        onRow={r => ({ onClick: () => navigate(`/configurazione/${r.id}`) })} />
    </div>
  );

  return (
    <div>
      <Tabs
        items={[
          { key: 'progetti', label: 'Progetti in configurazione', children: tabProgetti },
          { key: 'voci', label: 'Voci di costo', children: <VociDiCostoPage /> },
          { key: 'template', label: 'Template Timesheet', children: <TemplateTimesheetPage /> },
        ]}
      />
    </div>
  );
}
