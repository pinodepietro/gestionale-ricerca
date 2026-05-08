// frontend/src/pages/progetti/tabs/TabPartner.tsx
import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Select, InputNumber, Typography, App, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { partnerApi } from '../../../api/partner';
import { queryKeys } from '../../../utils/queryKeys';
import { apiErrorMessage } from '../../../utils/apiError';
import { formatEuro } from '../../../utils/formatters';
import { RbacGuard } from '../../../components/common/RbacGuard';

const { Text } = Typography;

const RUOLI_PARTNER = [
  { value: 'capofila', label: 'Capofila' },
  { value: 'partner', label: 'Partner' },
  { value: 'associato', label: 'Associato' },
  { value: 'subappaltatore', label: 'Subappaltatore' },
];

const COLORI_RUOLO: Record<string, string> = {
  capofila: 'gold', partner: 'blue', associato: 'green', subappaltatore: 'default',
};

const COLORI_TIPO: Record<string, string> = {
  università: 'blue', ente_pubblico: 'green', impresa: 'orange', no_profit: 'purple',
};

const LABEL_TIPO: Record<string, string> = {
  università: 'Università', ente_pubblico: 'Ente pubblico',
  impresa: 'Impresa', no_profit: 'No profit',
};

interface ProgettoPartnerRow {
  id: string;
  partner_id: string;
  ruolo: string;
  budget_assegnato?: number;
  partner?: { id: string; nome: string; tipo?: string; paese?: string };
}

interface Props { progettoId: string; }

export function TabPartner({ progettoId }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [form] = Form.useForm();

  const { data: righe, isLoading } = useQuery({
    queryKey: queryKeys.progetti.partner(progettoId),
    queryFn: () => progettiApi.partner.list(progettoId).then(r =>
      (r.data as { data: ProgettoPartnerRow[] }).data
    ),
    enabled: !!progettoId,
  });

  const { data: tuttiPartner } = useQuery({
    queryKey: queryKeys.config.partner,
    queryFn: () => partnerApi.list({ page_size: 200 } as Parameters<typeof partnerApi.list>[0]).then(r => r.data.data),
  });

  const aggiungi = useMutation({
    mutationFn: (values: { partner_id: string; ruolo: string; budget_assegnato?: number }) =>
      progettiApi.partner.add(progettoId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.partner(progettoId) });
      notification.success({ message: 'Partner aggiunto' });
      setModalAperta(false);
      form.resetFields();
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante l\'aggiunta') }),
  });

  const rimuovi = useMutation({
    mutationFn: (ppId: string) => progettiApi.partner.remove(progettoId, ppId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.partner(progettoId) });
      notification.success({ message: 'Partner rimosso' });
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante la rimozione') }),
  });

  // Partner già associati al progetto (per escluderli dalla select)
  const partnerGiaAssociati = new Set((righe ?? []).map(r => r.partner_id));

  const opzioniPartner = (tuttiPartner ?? [])
    .filter((p: { id: string }) => !partnerGiaAssociati.has(p.id))
    .map((p: { id: string; nome: string; tipo?: string }) => ({
      value: p.id,
      label: p.nome,
      tipo: p.tipo,
    }));

  const totaleBudget = (righe ?? [])
    .reduce((sum, r) => sum + (r.budget_assegnato ?? 0), 0);

  const colonne = [
    {
      title: 'Ente / Partner',
      key: 'nome',
      ellipsis: true,
      render: (_: unknown, r: ProgettoPartnerRow) => (
        <div>
          <Text strong>{r.partner?.nome ?? '—'}</Text>
          {r.partner?.tipo && (
            <Tag color={COLORI_TIPO[r.partner.tipo] ?? 'default'} style={{ marginLeft: 8, fontSize: 11 }}>
              {LABEL_TIPO[r.partner.tipo] ?? r.partner.tipo}
            </Tag>
          )}
          {r.partner?.paese && r.partner.paese !== 'IT' && (
            <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>{r.partner.paese}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Ruolo nel progetto',
      dataIndex: 'ruolo',
      width: 150,
      render: (v: string) => (
        <Tag color={COLORI_RUOLO[v] ?? 'default'}>
          {RUOLI_PARTNER.find(r => r.value === v)?.label ?? v}
        </Tag>
      ),
    },
    {
      title: 'Budget assegnato',
      dataIndex: 'budget_assegnato',
      width: 160,
      align: 'right' as const,
      render: (v?: number) => v ? formatEuro(v) : <Text type="secondary">—</Text>,
    },
    {
      title: '',
      key: 'azioni',
      width: 80,
      render: (_: unknown, r: ProgettoPartnerRow) => (
        <RbacGuard azione="partner:gestisci">
          <Popconfirm
            title="Rimuovere questo partner dal progetto?"
            onConfirm={() => rimuovi.mutate(r.id)}
            okText="Rimuovi" okButtonProps={{ danger: true }}
            cancelText="Annulla"
          >
            <Button size="small" danger icon={<DeleteOutlined />} type="text" />
          </Popconfirm>
        </RbacGuard>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text strong>Partner del progetto</Text>
          {totaleBudget > 0 && (
            <Text type="secondary">
              Budget totale partner: <Text strong>{formatEuro(totaleBudget)}</Text>
            </Text>
          )}
        </Space>
        <RbacGuard azione="partner:gestisci">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)}>
            Aggiungi partner
          </Button>
        </RbacGuard>
      </div>

      <Table
        columns={colonne}
        dataSource={righe ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Nessun partner associato al progetto' }}
        summary={() => (righe?.length ?? 0) > 1 && totaleBudget > 0 ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}>
              <Text strong>Totale budget partner</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <Text strong>{formatEuro(totaleBudget)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} />
          </Table.Summary.Row>
        ) : null}
      />

      <Modal
        title="Aggiungi partner al progetto"
        open={modalAperta}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Aggiungi"
        cancelText="Annulla"
        confirmLoading={aggiungi.isPending}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={(v) => aggiungi.mutate(v)}
          style={{ marginTop: 16 }}>
          <Form.Item name="partner_id" label="Ente / Partner" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Cerca e seleziona un partner..."
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={opzioniPartner}
              notFoundContent={opzioniPartner.length === 0
                ? 'Tutti i partner sono già associati al progetto'
                : 'Nessun partner trovato'}
            />
          </Form.Item>
          <Form.Item name="ruolo" label="Ruolo nel progetto" rules={[{ required: true }]}
            initialValue="partner">
            <Select options={RUOLI_PARTNER} />
          </Form.Item>
          <Form.Item name="budget_assegnato" label="Budget assegnato (€, facoltativo)">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
