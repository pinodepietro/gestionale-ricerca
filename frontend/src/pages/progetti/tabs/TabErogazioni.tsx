import { useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker,
  Select, Typography, App, Popconfirm, Row, Col, Statistic, Upload, Divider,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PaperClipOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { erogazioniApi, type Erogazione } from '../../../api/erogazioni';
import { budgetApi } from '../../../api/budget';
import { RbacGuard } from '../../../components/common/RbacGuard';
import { formatData } from '../../../utils/formatters';
import { apiErrorMessage } from '../../../utils/apiError';
import { queryKeys } from '../../../utils/queryKeys';
import type { BudgetVoce } from '../../../types/budget';

const { Text } = Typography;

const TIPI_EROGAZIONE = [
  { value: 'anticipazione',          label: 'Anticipazione' },
  { value: 'pagamento_fattura',      label: 'Pagamento fattura' },
  { value: 'trasferimento_fondi',    label: 'Trasferimento fondi da soggetto erogatore' },
];

const fmtEuro = (v: number): string => {
  const parts = v.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

interface Props { progettoId: string; stato?: string; }

export function TabErogazioni({ progettoId, stato }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [inModifica, setInModifica] = useState<Erogazione | null>(null);
  const [form] = Form.useForm();
  const [fileSelezionato, setFileSelezionato] = useState<File | null>(null);
  const [allocazioni, setAllocazioni] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['erogazioni', progettoId],
    queryFn: () => erogazioniApi.list(progettoId).then(r => r.data),
    enabled: !!progettoId,
  });

  const { data: budgetVoci } = useQuery({
    queryKey: ['budget', 'voci', progettoId],
    queryFn: () => budgetApi.voci.list(progettoId).then(r => r.data.data),
    enabled: !!progettoId && modalAperta,
  });

  const totaleAllocato = Object.values(allocazioni).reduce((s, v) => s + (v || 0), 0);

  const salva = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const vociFiltrate = Object.entries(allocazioni)
        .filter(([, imp]) => (imp ?? 0) > 0)
        .map(([budget_voce_id, importo]) => ({ budget_voce_id, importo }));
      if (vociFiltrate.length === 0) {
        throw new Error('Allocare almeno una voce di costo');
      }
      const importo = vociFiltrate.reduce((s, v) => s + v.importo, 0);
      const fd = new FormData();
      fd.append('importo', String(importo));
      fd.append('data_erogazione', (values.data_erogazione as dayjs.Dayjs).format('YYYY-MM-DD'));
      fd.append('tipo', values.tipo as string);
      if (values.descrizione) fd.append('descrizione', values.descrizione as string);
      fd.append('voci', JSON.stringify(vociFiltrate));
      if (fileSelezionato) fd.append('file', fileSelezionato);
      return inModifica
        ? erogazioniApi.update(progettoId, inModifica.id, fd).then(r => r.data)
        : erogazioniApi.create(progettoId, fd).then(r => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erogazioni', progettoId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: inModifica ? 'Erogazione aggiornata' : 'Erogazione registrata' });
      chiudiModal();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : apiErrorMessage(e, 'Errore nel salvataggio');
      notification.error({ message: msg });
    },
  });

  const elimina = useMutation({
    mutationFn: (id: string) => erogazioniApi.delete(progettoId, id).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erogazioni', progettoId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: 'Erogazione eliminata' });
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore nell\'eliminazione') }),
  });

  function apriModifica(e: Erogazione) {
    setInModifica(e);
    form.setFieldsValue({
      data_erogazione: dayjs(e.data_erogazione),
      tipo: e.tipo,
      descrizione: e.descrizione,
    });
    const alloc: Record<string, number> = {};
    (e.voci ?? []).forEach(v => { alloc[v.budget_voce_id] = v.importo; });
    setAllocazioni(alloc);
    setFileSelezionato(null);
    setModalAperta(true);
  }

  function chiudiModal() {
    setModalAperta(false);
    setInModifica(null);
    setFileSelezionato(null);
    setAllocazioni({});
    form.resetFields();
  }

  const totali = data?.totali;
  const erogazioni = data?.data ?? [];

  const colonne = [
    {
      title: 'Data', dataIndex: 'data_erogazione', width: 110,
      render: (v: string) => formatData(v),
    },
    {
      title: 'Tipo', dataIndex: 'tipo', width: 260,
      render: (v: string) => TIPI_EROGAZIONE.find(t => t.value === v)?.label ?? v,
    },
    { title: 'Descrizione', dataIndex: 'descrizione', ellipsis: true },
    {
      title: 'Importo', dataIndex: 'importo', width: 140, align: 'right' as const,
      render: (v: number) => <Text strong>{fmtEuro(v)}</Text>,
    },
    {
      title: 'Doc.', width: 70, align: 'center' as const,
      render: (_: unknown, r: Erogazione) =>
        r.ha_documento ? (
          <a href={erogazioniApi.documentoUrl(progettoId, r.id)} target="_blank" rel="noreferrer">
            <DownloadOutlined />
          </a>
        ) : <Text type="secondary">—</Text>,
    },
    {
      title: '', width: 90,
      render: (_: unknown, r: Erogazione) => (
        <RbacGuard azione="progetto:modifica">
          <Space>
            <Button icon={<EditOutlined />} size="small" type="text" onClick={() => apriModifica(r)} />
            <Popconfirm
              title="Eliminare questa erogazione?"
              onConfirm={() => elimina.mutate(r.id)}
              okText="Elimina" okType="danger" cancelText="Annulla"
            >
              <Button icon={<DeleteOutlined />} size="small" type="text" danger />
            </Popconfirm>
          </Space>
        </RbacGuard>
      ),
    },
  ];

  return (
    <div>
      {/* Riepilogo */}
      {totali && (
        <Row gutter={24} style={{ marginBottom: 24, background: '#fafafa', padding: '16px 24px', borderRadius: 8 }}>
          <Col span={8}>
            <Statistic
              title="Importo finanziato"
              value={fmtEuro(totali.importo_finanziato)}
              valueStyle={{ fontSize: 18 }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Totale erogato"
              value={fmtEuro(totali.totale_erogato)}
              valueStyle={{ fontSize: 18, color: '#1677ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Da ricevere"
              value={fmtEuro(totali.da_ricevere)}
              valueStyle={{ fontSize: 18, color: totali.da_ricevere > 0 ? '#fa8c16' : '#52c41a' }}
            />
          </Col>
        </Row>
      )}

      {/* Toolbar */}
      <Row justify="end" style={{ marginBottom: 16 }}>
        <RbacGuard azione="progetto:modifica">
          <Button
            type="primary" icon={<PlusOutlined />}
            onClick={() => { setAllocazioni({}); setModalAperta(true); }}
            disabled={stato === 'chiuso' || stato === 'rendicontato'}
          >
            Nuova erogazione
          </Button>
        </RbacGuard>
      </Row>

      <Table
        columns={colonne}
        dataSource={erogazioni}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Nessuna erogazione registrata' }}
      />

      {/* Modal form */}
      <Modal
        open={modalAperta}
        title={inModifica ? 'Modifica erogazione' : 'Nuova erogazione'}
        onCancel={chiudiModal}
        onOk={() => form.submit()}
        confirmLoading={salva.isPending}
        okText="Salva" cancelText="Annulla"
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={salva.mutate} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="data_erogazione" label="Data erogazione" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo erogazione" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <Select options={TIPI_EROGAZIONE} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descrizione" label="Descrizione (opzionale)">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Documentazione (opzionale)">
            <Upload
              maxCount={1}
              beforeUpload={file => { setFileSelezionato(file); return false; }}
              onRemove={() => setFileSelezionato(null)}
              fileList={fileSelezionato ? [{ uid: '1', name: fileSelezionato.name, status: 'done' }] : []}
            >
              <Button icon={<PaperClipOutlined />}>Allega documento</Button>
            </Upload>
            {inModifica?.ha_documento && !fileSelezionato && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                Documento già presente — carica un nuovo file per sostituirlo
              </Text>
            )}
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 13, marginTop: 8 }}>
            Allocazione per voce di costo
          </Divider>
          {(budgetVoci ?? []).length === 0 && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Nessuna voce di costo configurata per questo progetto.
            </Text>
          )}
          {(budgetVoci ?? []).map((bv: BudgetVoce) => (
            <Row key={bv.id} gutter={8} align="middle" style={{ marginBottom: 6 }}>
              <Col flex="1">
                <Text style={{ fontSize: 13 }}>
                  {bv.voce?.codice} — {bv.voce?.descrizione}
                </Text>
              </Col>
              <Col>
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: 150 }}
                  value={allocazioni[bv.id] ?? 0}
                  onChange={(v) => setAllocazioni(prev => ({ ...prev, [bv.id]: v ?? 0 }))}
                  formatter={v => v !== undefined ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                  parser={v => (parseFloat((v || '').replace(/\./g, '').replace(',', '.')) || 0) as unknown as 0}
                />
              </Col>
            </Row>
          ))}
          {(budgetVoci ?? []).length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 600 }}>
              Totale: € {fmtEuro(totaleAllocato)}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}
