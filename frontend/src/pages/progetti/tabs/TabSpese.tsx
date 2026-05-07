// frontend/src/pages/progetti/tabs/TabSpese.tsx
import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, DatePicker,
         Select, Typography, App, Popconfirm, Upload, Divider } from 'antd';
import { PlusOutlined, StopOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { budgetApi } from '../../../api/budget';
import { configApi } from '../../../api/config';
import { queryKeys } from '../../../utils/queryKeys';
import { RbacGuard } from '../../../components/common/RbacGuard';
import { formatEuro, formatData } from '../../../utils/formatters';
import type { Spesa } from '../../../types/budget';

const { Text } = Typography;

interface Props { progettoId: string; }

export function TabSpese({ progettoId }: Props) {
  const { notification, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [filtroVoce, setFiltroVoce] = useState<string | undefined>();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.progetti.spese(progettoId, { voce_id: filtroVoce }),
    queryFn: () => budgetApi.spese.list(progettoId, { voce_id: filtroVoce }).then(r => r.data),
    enabled: !!progettoId,
  });

  const { data: voci } = useQuery({
    queryKey: queryKeys.config.vociDiCosto,
    queryFn: () => configApi.vociDiCosto().then(r => r.data.data),
  });

  const { data: budgetVoci } = useQuery({
    queryKey: queryKeys.progetti.budget(progettoId),
    queryFn: () => budgetApi.voci.list(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const registraSpesa = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      budgetApi.spese.create(progettoId, {
        ...values,
        data: values.data ? dayjs(values.data as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      }).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.spese(progettoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.spese(progettoId, { voce_id: filtroVoce }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: 'Spesa registrata' });
      setModalAperta(false);
      form.resetFields();
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Errore durante la registrazione' });
    },
  });

  const annullaSpesa = useMutation({
    mutationFn: (id: string) => budgetApi.spese.annulla(id).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.spese(progettoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: 'Spesa annullata' });
    },
  });

  // Voci disponibili nel budget del progetto
  // Esclude la voce "personale" — il costo del personale viene dai timesheet, non dalle spese
  const vociDisponibili = budgetVoci
    ?.filter((bv: { voce_id: string; voce?: { codice: string; descrizione: string; categoria?: string }; categoria?: string }) => {
      const cat = bv.voce?.categoria ?? bv.categoria ?? '';
      return cat !== 'personale';
    })
    .map((bv: { voce_id: string; voce?: { codice: string; descrizione: string } }) => ({
      value: bv.voce_id,
      label: bv.voce ? `${bv.voce.codice} — ${bv.voce.descrizione}` : bv.voce_id,
    })) ?? [];

  const spese: Spesa[] = (data?.data ?? []).filter((s: Spesa) => s.stato !== 'annullata');
  const totale = spese.filter(s => s.stato === 'registrata').reduce((s, r) => s + r.importo, 0);

  const colonne = [
    { title: 'Data', dataIndex: 'data', width: 110, render: formatData },
    { title: 'N° documento', dataIndex: 'numero_documento', width: 140,
      render: (v: string) => v || '—' },
    { title: 'Voce di costo', dataIndex: 'voce_id', ellipsis: true,
      render: (id: string) => {
        const v = voci?.find((x: { id: string }) => x.id === id);
        return v ? `${v.codice} — ${v.descrizione}` : '—';
      }},
    { title: 'Descrizione', dataIndex: 'descrizione', ellipsis: true,
      render: (v: string) => v || '—' },
    { title: 'Importo', dataIndex: 'importo', align: 'right' as const,
      width: 120, render: formatEuro },
    {
      title: 'Stato', dataIndex: 'stato', width: 110,
      render: (stato: string) => (
        <Tag color={stato === 'registrata' ? 'green' : 'default'}>{stato}</Tag>
      ),
    },
    {
      title: '', key: 'azioni', width: 100,
      render: (_: unknown, r: Spesa) => (
        <Space>
          {r.allegato_path && (
            <Button size="small" icon={<PaperClipOutlined />} type="text"
              href={r.allegato_path} target="_blank" />
          )}
          {r.stato === 'registrata' && (
            <RbacGuard azione="spesa:annulla">
              <Button size="small" danger onClick={() => {
                modal.confirm({
                  title: 'Annullare questa spesa?',
                  content: `Importo: ${Number(r.importo).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}. L'importo verra stornato dal budget rendicontato.`,
                  okText: 'Si, annulla',
                  okType: 'danger',
                  cancelText: 'No',
                  onOk() {
                    modal.confirm({
                      title: 'Conferma definitiva',
                      content: 'Sei sicuro? La spesa verra annullata definitivamente.',
                      okText: 'Annulla spesa',
                      okType: 'danger',
                      cancelText: 'Indietro',
                      onOk() { annullaSpesa.mutate(r.id); },
                    });
                  },
                });
              }}>Annulla</Button>
            </RbacGuard>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text strong>Spese del progetto</Text>
          <Text type="secondary">Totale registrato: <Text strong>{formatEuro(totale)}</Text></Text>
        </Space>
        <Space>
          <Select
            placeholder="Filtra per voce"
            allowClear
            style={{ width: 220 }}
            options={vociDisponibili}
            onChange={setFiltroVoce}
          />
          <RbacGuard azione="spesa:registra">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)}>
              Nuova spesa
            </Button>
          </RbacGuard>
        </Space>
      </div>

      <Table
        columns={colonne}
        dataSource={spese}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        size="small"
        locale={{ emptyText: 'Nessuna spesa registrata' }}
        summary={() => spese.length > 0 ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4}>
              <Text strong>Totale spese attive</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right">
              <Text strong>{formatEuro(totale)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5} colSpan={2} />
          </Table.Summary.Row>
        ) : null}
      />

      <Modal
        title="Registra nuova spesa"
        open={modalAperta}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Registra"
        cancelText="Annulla"
        confirmLoading={registraSpesa.isPending}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={(v) => registraSpesa.mutate(v)}
          style={{ marginTop: 16 }}>
          <Form.Item name="voce_id" label="Voce di costo" rules={[{ required: true }]}>
            <Select placeholder="Seleziona voce di costo" options={vociDisponibili} />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="data" label="Data documento" rules={[{ required: true }]}
              style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="importo" label="Importo (€)" rules={[{ required: true }]}
              style={{ flex: 1 }}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Space>
          <Form.Item name="numero_documento" label="N° documento (fattura/ricevuta)">
            <Input placeholder="Es. FT-2024-001" />
          </Form.Item>
          <Form.Item name="descrizione" label="Descrizione">
            <Input.TextArea rows={2} placeholder="Descrizione della spesa" />
          </Form.Item>
          <Divider style={{ margin: '12px 0' }} />
          <Form.Item name="allegato" label="Allegato (facoltativo)">
            <Upload beforeUpload={() => false} maxCount={1} accept=".pdf,.jpg,.png">
              <Button icon={<UploadOutlined />}>Carica documento</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
