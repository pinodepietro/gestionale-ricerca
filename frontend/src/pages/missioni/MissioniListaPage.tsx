import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Typography, Row, Col, Tag, Select, Space, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { missioniApi, type Missione } from '../../api/missioni';
import { progettiApi } from '../../api/progetti';
import { formatData, formatEuro } from '../../utils/formatters';
import { useAuthStore } from '../../store/useAuthStore';
import { queryKeys } from '../../utils/queryKeys';

const { Title } = Typography;

const STATI_CONFIG: Record<string, { label: string; color: string }> = {
  bozza:          { label: 'Bozza',                   color: 'default' },
  attesa_ammin:   { label: 'Attesa Ammin. Progetto',  color: 'orange' },
  attesa_pi:      { label: 'Attesa Resp. Scientifico', color: 'blue' },
  attesa_dir_dip: { label: 'Attesa Dir. Dipartimento', color: 'purple' },
  attesa_dg:      { label: 'Attesa Dir. Generale',     color: 'geekblue' },
  approvata:      { label: 'Approvata',                color: 'success' },
  rigettata:      { label: 'Rigettata',                color: 'error' },
};

export function MissioniListaPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isPrivilegiato = user?.ruolo === 'superadmin' || user?.ruolo === 'direttore_generale';
  const [stato, setStato] = useState<string | undefined>();
  const [progettoId, setProgettoId] = useState<string | undefined>();
  const [soloMie, setSoloMie] = useState(false);
  const [page, setPage] = useState(1);

  const { data: progetti } = useQuery({
    queryKey: queryKeys.progetti.list({
      amministrativo_id: user?.ruolo === 'amministrativo' ? user?.id : undefined,
      solo_allocati: user?.ruolo !== 'amministrativo' && user?.ruolo !== 'superadmin' && user?.ruolo !== 'direttore_generale' ? true : undefined,
    }),
    queryFn: () => progettiApi.list({
      amministrativo_id: user?.ruolo === 'amministrativo' ? user?.id : undefined,
      solo_allocati: user?.ruolo !== 'amministrativo' && user?.ruolo !== 'superadmin' && user?.ruolo !== 'direttore_generale' ? true : undefined,
      page_size: 100
    }).then(r => r.data.data),
    enabled: !!user?.id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['missioni', stato, progettoId, soloMie, page],
    queryFn: () => missioniApi.list({ stato, progetto_id: progettoId, solo_mie: soloMie, page, page_size: 20 }).then(r => r.data),
  });

  const colonne = [
    {
      title: 'Data', dataIndex: 'created_at', width: 110,
      render: (v: string) => <span style={{ whiteSpace: 'nowrap' }}>{formatData(v)}</span>,
    },
    { title: 'Richiedente', dataIndex: 'richiedente_nome', width: 160 },
    {
      title: 'Progetto', width: 180,
      render: (_: unknown, m: Missione) =>
        m.progetto_codice ? `${m.progetto_codice} — ${m.progetto_titolo ?? ''}` : m.progetto_titolo ?? '—',
    },
    { title: 'Destinazione', dataIndex: 'destinazione' },
    {
      title: 'Periodo', width: 160,
      render: (_: unknown, m: Missione) =>
        m.data_inizio ? `${formatData(m.data_inizio)} — ${formatData(m.data_fine)}` : '—',
    },
    {
      title: 'Importo stimato', dataIndex: 'importo_stimato', width: 130, align: 'right' as const,
      render: (v: number) => formatEuro(v),
    },
    {
      title: 'Stato', dataIndex: 'stato', width: 200,
      render: (v: string) => {
        const cfg = STATI_CONFIG[v] ?? { label: v, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={2} style={{ margin: 0 }}>Missioni</Title></Col>
        {user?.ruolo !== 'monitor' && (
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/missioni/nuova')}>
              Nuova missione
            </Button>
          </Col>
        )}
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Seleziona progetto"
          allowClear style={{ width: 250 }}
          options={progetti?.map(p => ({ value: p.id, label: p.acronimo || p.codice })) ?? []}
          value={progettoId}
          onChange={v => { setProgettoId(v); setPage(1); }}
        />
        <Select
          placeholder="Filtra per stato"
          allowClear style={{ width: 210 }}
          options={Object.entries(STATI_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
          value={stato}
          onChange={v => { setStato(v); setPage(1); }}
        />
        {isPrivilegiato && (
          <Space>
            <span style={{ fontSize: 13 }}>Solo le mie:</span>
            <Switch checked={soloMie} onChange={v => { setSoloMie(v); setPage(1); }} />
          </Space>
        )}
      </Space>

      <Table
        columns={colonne}
        dataSource={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        onRow={m => ({ onClick: () => navigate(`/missioni/${m.id}`) })}
        rowClassName={() => 'clickable-row'}
        pagination={{
          current: page, pageSize: 20,
          total: data?.meta?.total ?? 0,
          onChange: setPage,
          showTotal: t => `${t} missioni`,
        }}
      />
    </div>
  );
}
