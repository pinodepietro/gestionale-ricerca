import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Typography, Row, Col, Tag, Select, Space, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { rimborsiSpesaApi, type RimborsoSpesa } from '../../api/rimborsiSpesa';
import { formatData, formatEuro } from '../../utils/formatters';
import { useAuthStore } from '../../store/useAuthStore';

const { Title } = Typography;

const STATI_CONFIG: Record<string, { label: string; color: string }> = {
  bozza:          { label: 'Bozza',                   color: 'default' },
  attesa_ammin:   { label: 'Attesa Ammin.',            color: 'orange' },
  attesa_rs:      { label: 'Attesa Resp. Scientifico', color: 'blue' },
  attesa_dir_dip: { label: 'Attesa Dir. Dipartimento', color: 'purple' },
  attesa_dg:      { label: 'Attesa Dir. Generale',     color: 'geekblue' },
  approvata:      { label: 'Approvata',                color: 'success' },
  rigettata:      { label: 'Rigettata',                color: 'error' },
};

export function RimborsiSpesaPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isPrivilegiato = user?.ruolo === 'superadmin' || user?.ruolo === 'direttore_generale';
  const [stato, setStato] = useState<string | undefined>();
  const [soloMiei, setSoloMiei] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['rimborsi-spesa', stato, soloMiei, page],
    queryFn: () => rimborsiSpesaApi.list({ stato, solo_miei: soloMiei, page, page_size: 20 }).then(r => r.data),
  });

  const colonne = [
    {
      title: 'Data', dataIndex: 'created_at', width: 110,
      render: (v: string) => <span style={{ whiteSpace: 'nowrap' }}>{formatData(v)}</span>,
    },
    {
      title: 'Richiedente', dataIndex: 'richiedente_nome', width: 160,
    },
    {
      title: 'Progetto / Tipo', width: 200,
      render: (_: unknown, r: RimborsoSpesa) =>
        r.autorizzazione.progetto_titolo ?? <em style={{ color: '#999' }}>Fondi individuali</em>,
    },
    {
      title: 'Autorizzazione', dataIndex: ['autorizzazione', 'oggetto'],
      render: (_: unknown, r: RimborsoSpesa) => r.autorizzazione.oggetto,
    },
    {
      title: 'Totale rimborso', dataIndex: 'totale_righe', width: 130, align: 'right' as const,
      render: (v: number) => formatEuro(v),
    },
    {
      title: 'Stato', dataIndex: 'stato', width: 180,
      render: (v: string) => {
        const cfg = STATI_CONFIG[v] ?? { label: v, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={2} style={{ margin: 0 }}>Rimborsi Spesa</Title></Col>
        {user?.ruolo !== 'monitor' && (
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/rimborsi-spesa/nuovo')}>
              Nuova richiesta di rimborso
            </Button>
          </Col>
        )}
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filtra per stato"
          allowClear style={{ width: 200 }}
          options={Object.entries(STATI_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
          value={stato}
          onChange={v => { setStato(v); setPage(1); }}
        />
        {isPrivilegiato && (
          <Space>
            <span style={{ fontSize: 13 }}>Solo le mie:</span>
            <Switch checked={soloMiei} onChange={v => { setSoloMiei(v); setPage(1); }} />
          </Space>
        )}
      </Space>

      <Table
        columns={colonne}
        dataSource={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        onRow={r => ({ onClick: () => navigate(`/rimborsi-spesa/${r.id}`) })}
        rowClassName={() => 'clickable-row'}
        pagination={{
          current: page, pageSize: 20,
          total: data?.meta?.total ?? 0,
          onChange: setPage,
          showTotal: t => `${t} richieste`,
        }}
      />
    </div>
  );
}
