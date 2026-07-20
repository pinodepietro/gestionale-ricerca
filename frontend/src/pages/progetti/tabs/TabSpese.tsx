// frontend/src/pages/progetti/tabs/TabSpese.tsx
import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, DatePicker,
         Select, Typography, App, Upload, Divider, Alert } from 'antd';
import { PlusOutlined, StopOutlined, PaperClipOutlined, UploadOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { budgetApi } from '../../../api/budget';
import { configApi } from '../../../api/config';
import { progettiApi } from '../../../api/progetti';
import { queryKeys } from '../../../utils/queryKeys';
import { apiErrorMessage } from '../../../utils/apiError';
import { RbacGuard } from '../../../components/common/RbacGuard';
import { formatEuro, formatData } from '../../../utils/formatters';
import type { Spesa, Impegno } from '../../../types/budget';
import type { WorkPackage } from '../../../types/struttura';

const { Text } = Typography;

interface Props { progettoId: string; stato?: string; onVaiAImpegno?: (impegnoId: string) => void; }

export function TabSpese({ progettoId, stato, onVaiAImpegno }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [filtroVoce, setFiltroVoce] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [spesaDaAnnullare, setSpesaDaAnnullare] = useState<Spesa | null>(null);
  const [confermaStep, setConfermaStep] = useState<1 | 2>(1);
  const vociSelectedWatch = Form.useWatch('voce_id', form);

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

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId),
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });
  const gestionePerWp: boolean = progetto?.gestione_per_wp ?? false;

  const { data: wps } = useQuery({
    queryKey: ['wp', progettoId],
    queryFn: () => progettiApi.wp.list(progettoId).then(r => r.data.data as WorkPackage[]),
    enabled: gestionePerWp,
  });
  const wpOptions = (wps ?? []).map((w: WorkPackage) => ({ value: w.id, label: `${w.codice} — ${w.titolo}` }));
  const wpNome = (wpId: string | null | undefined) => wps?.find((w: WorkPackage) => w.id === wpId)?.codice ?? '—';

  const { data: impegniVoce } = useQuery({
    queryKey: queryKeys.progetti.impegni(progettoId + (vociSelectedWatch ?? '') + '_disp'),
    queryFn: () => budgetApi.impegni.list(progettoId, { voce_id: vociSelectedWatch, solo_disponibili: true }).then(r => r.data.data),
    enabled: !!progettoId && !!vociSelectedWatch && modalAperta,
  });

  const registraSpesa = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      budgetApi.spese.create(progettoId, {
        ...values,
        data: values.data ? dayjs(values.data as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        data_documento: values.data_documento ? dayjs(values.data_documento as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      }).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'spese'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.impegni(progettoId) });
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
      queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'spese'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.impegni(progettoId) });
      notification.success({ message: 'Spesa eliminata' });
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante l\'eliminazione') }),
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

  const spese: Spesa[] = data?.data ?? [];
  const totale = spese.filter(s => s.stato === 'registrata').reduce((acc, r) => acc + r.importo, 0);

  const colonne = [
    { title: 'Data', dataIndex: 'data', width: 110, render: formatData },
    { title: 'N° documento', dataIndex: 'numero_documento', width: 140,
      render: (v: string) => v || '—' },
    ...(gestionePerWp ? [{
      title: 'WP', dataIndex: 'wp_id', width: 80,
      render: (id: string | null) => id ? <Tag color="blue" style={{ fontSize: 11 }}>{wpNome(id)}</Tag> : null,
    }] : []),
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
      title: 'Impegno', dataIndex: 'impegno_id', width: 80, align: 'center' as const,
      render: (v: string | null) => v
        ? <Button size="small" type="text" icon={<LinkOutlined style={{ color: '#1677ff' }} />}
            title="Vai all'impegno collegato" onClick={() => onVaiAImpegno?.(v)} />
        : null,
    },
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
              <Button size="small" danger icon={<StopOutlined />}
                onClick={() => { setSpesaDaAnnullare(r); setConfermaStep(1); }}>
                Elimina
              </Button>
            </RbacGuard>
          )}
        </Space>
      ),
    },
  ];

  const chiudiAnnulla = () => { setSpesaDaAnnullare(null); setConfermaStep(1); };

  if (stato === 'bozza') {
    return (
      <Alert
        type="warning"
        showIcon
        message="Progetto non ancora attivo"
        description="Attiva il progetto per poter registrare le spese."
        style={{ marginTop: 8 }}
      />
    );
  }

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
            <Table.Summary.Cell index={5} colSpan={3} />
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
          {gestionePerWp && (
            <Form.Item name="wp_id" label="Work Package" rules={[{ required: true, message: 'Seleziona il WP' }]}>
              <Select placeholder="Seleziona Work Package" options={wpOptions} />
            </Form.Item>
          )}
          <Form.Item name="voce_id" label="Voce di costo" rules={[{ required: true }]}>
            <Select
              placeholder="Seleziona voce di costo"
              options={vociDisponibili}
              onChange={() => form.setFieldValue('impegno_id', undefined)}
            />
          </Form.Item>
          {vociSelectedWatch && (
            <Form.Item
              name="impegno_id"
              label="Impegno di riferimento"
              rules={[{ required: true, message: 'Seleziona un impegno di riferimento' }]}
            >
              <Select
                placeholder="Seleziona un impegno disponibile per questa voce"
                options={(impegniVoce as Impegno[] | undefined)
                  ?.map(i => ({
                    value: i.id,
                    label: `${i.data ? i.data.substring(0, 10) : ''} — ${i.descrizione} (${formatEuro(i.importo)})`,
                  })) ?? []}
                notFoundContent="Nessun impegno disponibile per questa voce"
              />
            </Form.Item>
          )}
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="data" label="Data spesa" rules={[{ required: true }]}
              style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="importo" label="Importo (€)" rules={[{ required: true }]}
              style={{ flex: 1 }}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Space>
          <Form.Item name="data_documento" label="Data documento (per rendicontazione)">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
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

      {/* Modal doppia conferma annullamento */}
      <Modal
        open={!!spesaDaAnnullare && confermaStep === 1}
        title="Eliminare questa spesa?"
        onCancel={chiudiAnnulla}
        onOk={() => setConfermaStep(2)}
        okText="Sì, continua"
        okButtonProps={{ danger: true }}
        cancelText="No, torna indietro"
        width={440}
      >
        {spesaDaAnnullare && (
          <>
            <p>Stai per eliminare definitivamente la seguente spesa:</p>
            <p><strong>Importo:</strong> {formatEuro(spesaDaAnnullare.importo)}</p>
            <p><strong>Data:</strong> {formatData(spesaDaAnnullare.data)}</p>
            {spesaDaAnnullare.descrizione && <p><strong>Descrizione:</strong> {spesaDaAnnullare.descrizione}</p>}
            <p>L&apos;importo verrà stornato dal budget rendicontato.</p>
          </>
        )}
      </Modal>

      <Modal
        open={!!spesaDaAnnullare && confermaStep === 2}
        title="Conferma eliminazione"
        onCancel={chiudiAnnulla}
        onOk={() => {
          if (spesaDaAnnullare) annullaSpesa.mutate(spesaDaAnnullare.id);
          chiudiAnnulla();
        }}
        okText="Elimina spesa definitivamente"
        okButtonProps={{ danger: true, loading: annullaSpesa.isPending }}
        cancelText="Indietro"
        width={400}
      >
        <p>Sei sicuro? <strong>La spesa verrà rimossa e non sarà più recuperabile.</strong></p>
      </Modal>
    </div>
  );
}
