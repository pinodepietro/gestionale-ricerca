import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Button, Typography, Row, Col, Space, Empty, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { missioniApi, rimborsiMissioneApi, type MissioneDisponibile } from '../../api/missioni';
import { formatData } from '../../utils/formatters';
import { apiErrorMessage } from '../../utils/apiError';

const { Title, Text } = Typography;

export function RimborsoMissioneNuovoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const missioneIdPre = searchParams.get('missione_id');

  const { data, isLoading } = useQuery({
    queryKey: ['rimborsi-missione-disponibili'],
    queryFn: () => rimborsiMissioneApi.missioniDisponibili().then(r => r.data.data),
  });

  const crea = useMutation({
    mutationFn: (missioneId: string) => missioniApi.creaRimborso(missioneId).then(r => r.data),
    onSuccess: (res) => {
      const rimborsoId = res.data?.rimborso?.id;
      if (rimborsoId) navigate(`/rimborsi-missione/${rimborsoId}`);
      else navigate('/rimborsi-missione');
    },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nella creazione del rimborso')),
  });

  const missioni = data ?? [];
  // se c'è un missione_id in query string, mostra solo quella
  const righe = missioneIdPre
    ? missioni.filter(m => m.id === missioneIdPre)
    : missioni;

  const colonne = [
    {
      title: 'Approvata il', dataIndex: 'approvata_il', width: 120,
      render: (v: string) => formatData(v),
    },
    { title: 'Progetto', dataIndex: 'progetto_titolo', width: 220 },
    { title: 'Titolo missione', dataIndex: 'titolo' },
    { title: 'Destinazione', dataIndex: 'destinazione', width: 160 },
    {
      title: 'Periodo', width: 160,
      render: (_: unknown, m: MissioneDisponibile) =>
        `${formatData(m.data_inizio)} — ${formatData(m.data_fine)}`,
    },
    {
      title: '', width: 160, align: 'right' as const,
      render: (_: unknown, m: MissioneDisponibile) => (
        <Button type="primary" size="small" loading={crea.isPending} onClick={() => crea.mutate(m.id)}>
          Richiedi rimborso
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rimborsi-missione')}>Indietro</Button>
            <Title level={3} style={{ margin: 0 }}>Nuova richiesta di rimborso missione</Title>
          </Space>
        </Col>
      </Row>

      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Seleziona la missione approvata per cui richiedere il rimborso spese.
      </Text>

      <Table
        columns={colonne}
        dataSource={righe}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: <Empty description="Nessuna missione approvata disponibile per il rimborso" /> }}
      />
    </div>
  );
}
