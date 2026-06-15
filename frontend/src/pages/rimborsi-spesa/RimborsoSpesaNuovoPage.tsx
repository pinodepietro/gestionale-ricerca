import { useNavigate } from 'react-router-dom';
import { Table, Button, Typography, Row, Col, Space, Empty, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { rimborsiSpesaApi, type AutorizzazioneDisponibile } from '../../api/rimborsiSpesa';
import { formatData, formatEuro } from '../../utils/formatters';
import { apiErrorMessage } from '../../utils/apiError';

const { Title, Text } = Typography;

export function RimborsoSpesaNuovoPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['rimborsi-spesa-autorizzazioni-disponibili'],
    queryFn: () => rimborsiSpesaApi.autorizzazioniDisponibili().then(r => r.data.data),
  });

  const crea = useMutation({
    mutationFn: (ras_id: string) => rimborsiSpesaApi.create(ras_id).then(r => r.data.data),
    onSuccess: (r) => navigate(`/rimborsi-spesa/${r.id}`),
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nella creazione della richiesta')),
  });

  const colonne = [
    {
      title: 'Approvata il', dataIndex: 'data_approvazione_dg', width: 110,
      render: (v: string) => formatData(v),
    },
    {
      title: 'Progetto / Tipo', width: 220,
      render: (_: unknown, r: AutorizzazioneDisponibile) =>
        r.progetto_titolo ?? <em style={{ color: '#999' }}>Fondi individuali</em>,
    },
    { title: 'Oggetto', dataIndex: 'oggetto' },
    {
      title: 'Importo autorizzato', dataIndex: 'importo', width: 150, align: 'right' as const,
      render: (v: number) => formatEuro(v),
    },
    {
      title: '', width: 140, align: 'right' as const,
      render: (_: unknown, r: AutorizzazioneDisponibile) => (
        <Button type="primary" size="small" loading={crea.isPending} onClick={() => crea.mutate(r.id)}>
          Richiedi rimborso
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rimborsi-spesa')}>Indietro</Button>
            <Title level={3} style={{ margin: 0 }}>Nuova richiesta di rimborso</Title>
          </Space>
        </Col>
      </Row>

      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Seleziona l'autorizzazione di spesa approvata per cui richiedere il rimborso.
      </Text>

      <Table
        columns={colonne}
        dataSource={data ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: <Empty description="Nessuna autorizzazione di spesa disponibile per il rimborso" /> }}
      />
    </div>
  );
}
