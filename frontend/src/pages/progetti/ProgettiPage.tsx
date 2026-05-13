// frontend/src/pages/progetti/ProgettiPage.tsx
import { useState } from 'react';
import { Table, Input, Select, Space, Typography, Button, Row, Col, Popconfirm, notification } from 'antd';
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { progettiApi } from '../../api/progetti';
import { queryKeys } from '../../utils/queryKeys';
import { StatoBadge } from '../../components/common/StatoBadge';
import { RbacGuard } from '../../components/common/RbacGuard';
import { formatData, formatEuro } from '../../utils/formatters';
import { configApi } from '../../api/config';
import type { Progetto } from '../../types/progetto';
import type { StatoProgetto } from '../../config/constants';

const { Title } = Typography;

export function ProgettiPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [search, setSearch] = useState('');
  const [stato, setStato] = useState<StatoProgetto | undefined>();
  const [tipo, setTipo] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const isAdmin = user?.ruolo === 'amministrativo' || user?.ruolo === 'superadmin';
  const queryClient = useQueryClient();

  const { mutate: eliminaProgetto } = useMutation({
    mutationFn: (id: string) => progettiApi.delete(id),
    onSuccess: () => {
      notification.success({ message: 'Progetto eliminato' });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.all });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail?.error?.message ?? 'Errore durante l\'eliminazione';
      notification.error({ message: msg });
    },
  });

  const { data: tipiProgetto } = useQuery({
    queryKey: queryKeys.config.tipiProgetto,
    queryFn: () => configApi.tipiProgetto().then(r => r.data.data),
  });

  const filters = {
    search, tipo, page, page_size: 20,
    stato,
    includi_bozze: isAdmin ? true : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.progetti.list(filters),
    queryFn: () => progettiApi.list(filters).then((r) => r.data),
  });

  const columns = [
    {
      title: 'Codice',
      dataIndex: 'codice',
      width: 140,
      render: (codice: string, record: Progetto) => (
        <a onClick={() => navigate(`/progetti/${record.id}`)}>{codice}</a>
      ),
    },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Tipo', dataIndex: 'tipo', width: 130 },
    {
      title: 'Stato',
      dataIndex: 'stato',
      width: 130,
      render: (stato: StatoProgetto) => <StatoBadge tipo="progetto" stato={stato} />,
    },
    {
      title: 'Inizio',
      dataIndex: 'data_inizio',
      width: 110,
      render: formatData,
    },
    {
      title: 'Fine',
      dataIndex: 'data_fine',
      width: 110,
      render: formatData,
    },
    {
      title: 'Costo progetto',
      dataIndex: 'costo_totale',
      width: 140,
      align: 'right' as const,
      render: formatEuro,
    },
    ...(isAdmin ? [{
      title: '',
      key: 'azioni',
      width: 60,
      render: (_: unknown, record: Progetto) =>
        (record.stato === 'bozza' || user?.ruolo === 'superadmin') ? (
          <Popconfirm
            title="Eliminare il progetto?"
            description={record.stato !== 'bozza'
              ? `Il progetto è in stato "${record.stato}". Tutti i dati associati saranno persi. Continuare?`
              : "L'operazione è irreversibile."}
            okText="Elimina"
            okButtonProps={{ danger: true }}
            cancelText="Annulla"
            onConfirm={(e) => { e?.stopPropagation(); eliminaProgetto(record.id); }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        ) : null,
    }] : []),
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Progetti</Title>
        </Col>
        <Col>
          <RbacGuard azione="progetto:crea">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/configurazione/nuovo')}
            >
              Nuovo progetto
            </Button>
          </RbacGuard>
        </Col>
      </Row>

      {/* Filtri */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Cerca per codice, titolo..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 280 }}
          allowClear
        />
        <Select
          placeholder="Stato"
          allowClear
          style={{ width: 150 }}
          onChange={(v) => { setStato(v); setPage(1); }}
          options={[
            { value: 'bozza', label: 'Da attivare' },
            { value: 'attivo', label: 'Attivo' },
            { value: 'chiuso', label: 'Chiuso' },
            { value: 'rendicontato', label: 'Rendicontato' },
          ]}
        />
        <Select
          placeholder="Tipo finanziamento"
          allowClear
          style={{ width: 200 }}
          onChange={(v) => { setTipo(v); setPage(1); }}
          options={(tipiProgetto ?? []).map((t: { nome: string }) => ({ value: t.nome, label: t.nome }))}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.meta.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => `${total} progetti`,
        }}
        onRow={(record) => ({ onClick: () => navigate(`/progetti/${record.id}`) })}
        rowClassName="cursor-pointer"
      />
    </div>
  );
}
