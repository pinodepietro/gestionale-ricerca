import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Button, Typography, Row, Col, Tag, Select, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { proposteApi } from '../../api/proposte';
import { useAuthStore } from '../../store/useAuthStore';
import { canDo } from '../../utils/rbac';
import type { Proposta, StatoProposta } from '../../types/proposta';

const { Title } = Typography;

const STATI: { value: StatoProposta; label: string; color: string }[] = [
  { value: 'in_preparazione', label: 'In preparazione', color: 'default' },
  { value: 'sottomessa',      label: 'Sottomessa',      color: 'blue' },
  { value: 'approvata',       label: 'Approvata',       color: 'green' },
  { value: 'rigettata',       label: 'Rigettata',       color: 'red' },
];

function StatoTag({ stato }: { stato: StatoProposta }) {
  const s = STATI.find(s => s.value === stato);
  return <Tag color={s?.color ?? 'default'}>{s?.label ?? stato}</Tag>;
}

export function PropostePage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [search, setSearch] = useState('');
  const [statoFiltro, setStatoFiltro] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['proposte', search, statoFiltro, page],
    queryFn: () => proposteApi.list({ search, stato: statoFiltro, page, page_size: 20 }).then(r => r.data),
  });

  const colonne = [
    { title: 'Acronimo', dataIndex: 'acronimo', width: 120, ellipsis: true },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Bando / Call', dataIndex: 'bando', ellipsis: true },
    {
      title: 'Scadenza bando', dataIndex: 'data_scadenza_bando', width: 130,
      render: (v: string) => v ? new Date(v).toLocaleDateString('it-IT') : '—',
    },
    {
      title: 'Responsabile', width: 180,
      render: (_: unknown, r: Proposta) =>
        r.responsabile_scientifico
          ? `${r.responsabile_scientifico.cognome} ${r.responsabile_scientifico.nome}`
          : '—',
    },
    {
      title: 'Stato', dataIndex: 'stato', width: 140,
      render: (v: StatoProposta) => <StatoTag stato={v} />,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={2} style={{ margin: 0 }}>Proposte di progetto</Title></Col>
        <Col>
          {user && canDo(user.ruolo, 'proposta:crea') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/proposte/nuova')}>
              Nuova proposta
            </Button>
          )}
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Cerca per titolo, acronimo, bando..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 320 }}
          allowClear
        />
        <Select
          placeholder="Filtra per stato"
          allowClear
          style={{ width: 180 }}
          options={STATI.map(s => ({ value: s.value, label: s.label }))}
          value={statoFiltro}
          onChange={v => { setStatoFiltro(v); setPage(1); }}
        />
      </Space>

      <Table
        columns={colonne}
        dataSource={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        onRow={r => ({ onClick: () => navigate(`/proposte/${r.id}`) })}
        rowClassName={() => 'clickable-row'}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.meta?.total ?? 0,
          onChange: setPage,
          showTotal: t => `${t} proposte`,
        }}
      />
    </div>
  );
}
