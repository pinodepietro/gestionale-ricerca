// frontend/src/pages/progetti/ModificaProgettoDrawer.tsx
import { useEffect, useRef, useState } from 'react';
import { Drawer, Tabs, Form, Input, InputNumber, DatePicker, Button, Select,
         Table, Space, Modal, App, Divider, Row, Col, Switch, Tag, Typography, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Step6BudgetWP } from '../configurazione/WizardProgetto/Step6BudgetWP';
import { Step7PersonaleWP } from '../configurazione/WizardProgetto/Step7PersonaleWP';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { progettiApi } from '../../api/progetti';
import { budgetApi } from '../../api/budget';
import { configApi } from '../../api/config';
import { personaleApi } from '../../api/personale';
import { dipartimentiApi } from '../../api/autorizzazioni';
import { queryKeys } from '../../utils/queryKeys';
import { formatData, formatOre } from '../../utils/formatters';
import { CreaTipoProgettoButton } from '../../components/common/CreaTipoProgettoButton';
import { apiClient } from '../../api/client';

const { Text } = Typography;
const EURO = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

const CATEGORIE_VOCE = [
  { value: 'personale', label: 'Personale' },
  { value: 'materiali', label: 'Materiali' },
  { value: 'servizi', label: 'Servizi' },
  { value: 'missioni', label: 'Missioni' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'altro', label: 'Altro' },
];

interface Props {
  progettoId: string;
  aperto: boolean;
  onChiudi: () => void;
}

export function ModificaProgettoDrawer({ progettoId, aperto, onChiudi }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId),
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
    enabled: aperto && !!progettoId,
  });
  const gestionePerWp: boolean = progetto?.gestione_per_wp ?? false;

  const tabItems = [
    { key: 'anagrafica', label: 'Anagrafica', children: <TabAnagrafica progettoId={progettoId} onSalvato={() => { queryClient.invalidateQueries({ queryKey: queryKeys.progetti.detail(progettoId) }); notification.success({ message: 'Progetto aggiornato' }); }} /> },
    { key: 'budget', label: 'Budget e voci', children: <TabBudgetModifica progettoId={progettoId} /> },
    { key: 'wp', label: 'Work Package', children: <TabWpModifica progettoId={progettoId} /> },
    { key: 'personale', label: 'Allocazioni', children: <TabAllocazioniModifica progettoId={progettoId} /> },
    ...(gestionePerWp ? [
      {
        key: 'budget-wp', label: 'Budget WP',
        children: <Step6BudgetWP progettoId={progettoId}
          onCompletato={() => notification.success({ message: 'Budget WP aggiornato' })} />,
      },
      {
        key: 'personale-wp', label: 'Personale WP',
        children: <Step7PersonaleWP progettoId={progettoId}
          onCompletato={() => notification.success({ message: 'Ripartizione ore WP aggiornata' })} />,
      },
    ] : []),
  ];

  return (
    <Drawer
      title="Modifica progetto"
      width={900}
      open={aperto}
      onClose={onChiudi}
      destroyOnClose
    >
      <Tabs items={tabItems} />
    </Drawer>
  );
}

// ── Tab Anagrafica ────────────────────────────────────────────────────────────
function TabAnagrafica({ progettoId, onSalvato }: { progettoId: string; onSalvato: () => void }) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId),
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
  });

  const { data: tipiProgetto } = useQuery({
    queryKey: queryKeys.config.tipiProgetto,
    queryFn: () => configApi.tipiProgetto().then(r => r.data.data),
  });

  const { data: dipartimenti } = useQuery({
    queryKey: ['dipartimenti'],
    queryFn: () => dipartimentiApi.list().then(r => r.data.data),
  });

  useEffect(() => {
    if (progetto) {
      form.setFieldsValue({
        ...progetto,
        data_inizio: progetto.data_inizio ? dayjs(progetto.data_inizio) : null,
        data_fine: progetto.data_fine ? dayjs(progetto.data_fine) : null,
        data_fine_rendicontazione: progetto.data_fine_rendicontazione
          ? dayjs(progetto.data_fine_rendicontazione) : null,
      });
    }
  }, [progetto, form]);

  const { mutate: salva, isPending } = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        data_inizio: values.data_inizio ? dayjs(values.data_inizio as dayjs.Dayjs).format('YYYY-MM-DD') : null,
        data_fine: values.data_fine ? dayjs(values.data_fine as dayjs.Dayjs).format('YYYY-MM-DD') : null,
        data_fine_rendicontazione: values.data_fine_rendicontazione
          ? dayjs(values.data_fine_rendicontazione as dayjs.Dayjs).format('YYYY-MM-DD') : null,
      };
      return progettiApi.update(progettoId, payload as Parameters<typeof progettiApi.update>[1]).then(r => r.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.detail(progettoId) });
      onSalvato();
    },
  });

  return (
    <Form form={form} layout="vertical" onFinish={salva}>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="codice" label="Codice" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="acronimo" label="Acronimo">
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="cup" label="CUP">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="titolo" label="Titolo" rules={[{ required: true }]}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="descrizione" label="Descrizione">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="tipo" label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Tipo progetto <CreaTipoProgettoButton />
            </span>
          } rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Select
              options={(tipiProgetto ?? []).map((t: { nome: string }) => ({ value: t.nome, label: t.nome }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="data_fine" label="Data fine" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="data_fine_rendicontazione" label="Fine rendicontazione">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="costo_totale" label="Costo totale (€)" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="importo_finanziato" label="Importo finanziato (€)" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="dipartimento_id" label="Dipartimento" rules={[{ required: true, message: 'Seleziona il dipartimento' }]}>
        <Select
          placeholder="Seleziona dipartimento di afferenza"
          options={(dipartimenti as { id: string; nome: string }[] | undefined)
            ?.map(d => ({ value: d.id, label: d.nome })) ?? []}
        />
      </Form.Item>
      <Form.Item name="riferimento_bando" label="Riferimento bando">
        <Input.TextArea rows={2} placeholder="Estremi del bando di finanziamento, decreto, convenzione..." />
      </Form.Item>
      <Form.Item name="gestione_per_wp" label="Gestione costi per Work Package" valuePropName="checked"
        tooltip={progetto?.stato === 'bozza'
          ? 'Scegli se gestire i costi a livello di WP o di progetto complessivo. Non modificabile dopo l\'attivazione.'
          : 'Non modificabile: il progetto è già stato attivato'}>
        <Switch disabled={progetto?.stato !== 'bozza'} />
      </Form.Item>
      <Form.Item name="note" label="Note">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending}>Salva modifiche</Button>
    </Form>
  );
}

// ── Form creazione voce di costo ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NuovaVoceForm({ form, onFinish }: { form: any; onFinish: (v: Record<string, unknown>) => void }) {
  const categoriaVal = Form.useWatch('categoria', form);
  return (
    <Form form={form} layout="vertical" style={{ marginTop: 12 }}
      onFinish={(v: Record<string, unknown>) => {
        const payload = { ...v };
        if (v.categoria === 'altro') {
          payload.categoria = v.categoria_custom ?? 'altro';
        }
        delete payload.categoria_custom;
        onFinish(payload);
      }}>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="codice" label="Codice" rules={[{ required: true }]}>
            <Input placeholder="es. B.3" />
          </Form.Item>
        </Col>
        <Col span={16}>
          <Form.Item name="categoria" label="Categoria" rules={[{ required: true }]}>
            <Select options={CATEGORIE_VOCE} />
          </Form.Item>
        </Col>
      </Row>
      {categoriaVal === 'altro' && (
        <Form.Item name="categoria_custom" label="Nome categoria personalizzata" rules={[{ required: true, message: 'Inserisci il nome della categoria' }]}>
          <Input placeholder="es. Consulenze esterne" autoFocus />
        </Form.Item>
      )}
      <Form.Item name="descrizione" label="Descrizione" rules={[{ required: true }]}>
        <Input placeholder="es. Attrezzature specialistiche" />
      </Form.Item>
    </Form>
  );
}

// ── Tab Budget Voci ───────────────────────────────────────────────────────────
type VoceBudget = { id?: string; voce_id: string; wp_id?: string | null; importo_previsto: number };

function TabBudgetModifica({ progettoId }: { progettoId: string }) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [nuovaVoceForm] = Form.useForm();
  const [voci, setVoci] = useState<VoceBudget[]>([]);
  const [limiti, setLimiti] = useState<Record<string, number>>({});
  const [selectOpen, setSelectOpen] = useState(false);
  const [nuovaVoceAperta, setNuovaVoceAperta] = useState(false);
  const inizializzato = useRef(false);

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId),
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
  });

  const { data: budgetEsistente } = useQuery({
    queryKey: queryKeys.progetti.budget(progettoId),
    queryFn: () => budgetApi.voci.list(progettoId).then(r => r.data.data),
    staleTime: 0, gcTime: 0,
  });

  const { data: tutteVoci } = useQuery({
    queryKey: queryKeys.config.vociDiCosto,
    queryFn: () => configApi.vociDiCosto().then(r => r.data.data),
  });

  useEffect(() => {
    if (budgetEsistente && !inizializzato.current) {
      inizializzato.current = true;
      // Solo le voci di progetto (wp_id=null): quelle WP si gestiscono nella tab "Budget WP"
      const vociProgetto = budgetEsistente.filter(
        (v: { wp_id?: string | null }) => v.wp_id === null || v.wp_id === undefined
      );
      setVoci(vociProgetto.map((v: { id: string; voce_id: string; importo_previsto: number }) => ({
        id: v.id, voce_id: v.voce_id, importo_previsto: v.importo_previsto,
      })));
      const lim: Record<string, number> = {};
      vociProgetto.forEach((v: { voce_id: string; importo_speso?: number; importo_impegnato?: number }) => {
        lim[v.voce_id] = (v.importo_speso ?? 0) + (v.importo_impegnato ?? 0);
      });
      setLimiti(lim);
    }
  }, [budgetEsistente]);

  const costoTotale: number = progetto?.costo_totale ?? 0;
  const totaleVoci = voci.reduce((s, v) => s + Number(v.importo_previsto), 0);
  const diff = Math.round((costoTotale - totaleVoci) * 100) / 100;
  const totaleOK = Math.abs(diff) < 0.01;
  const hasVincolati = voci.some(v => (limiti[v.voce_id] ?? 0) > Number(v.importo_previsto));

  const { mutate: salva, isPending } = useMutation({
    mutationFn: () => progettiApi.budget.salva(progettoId, voci.map(v => ({ voce_id: v.voce_id, importo_previsto: v.importo_previsto, id: v.id }))).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      inizializzato.current = false;
      notification.success({ message: 'Budget aggiornato' });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore durante il salvataggio';
      notification.error({ message: msg });
    },
  });

  const { mutate: creaVoce, isPending: creaVocePending } = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      apiClient.post<{ data: { id: string } }>('/voci-di-costo', values).then(r => r.data.data),
    onSuccess: (nuova) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.vociDiCosto });
      notification.success({ message: 'Voce di costo creata' });
      setNuovaVoceAperta(false);
      nuovaVoceForm.resetFields();
      setVoci(prev => prev.find(x => x.voce_id === nuova.id) ? prev : [...prev, { voce_id: nuova.id, wp_id: null, importo_previsto: 0 }]);
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore durante la creazione';
      notification.error({ message: msg });
    },
  });

  const dropdownRender = (menu: React.ReactElement) => (
    <>
      {menu}
      <Divider style={{ margin: '4px 0' }} />
      <div style={{ padding: '4px 8px 8px' }}>
        <Button
          type="link" icon={<PlusOutlined />} size="small"
          onMouseDown={e => e.preventDefault()}
          onClick={() => { setSelectOpen(false); setNuovaVoceAperta(true); }}
        >
          Crea nuova voce...
        </Button>
      </div>
    </>
  );

  const colonne = [
    {
      title: 'Voce di costo', dataIndex: 'voce_id',
      render: (id: string) => {
        const v = (tutteVoci as { id: string; codice: string; descrizione: string }[] | undefined)?.find(x => x.id === id);
        return v ? `${v.codice} — ${v.descrizione}` : id;
      },
    },
    {
      title: 'Min (sp.+imp.)', dataIndex: 'voce_id', align: 'right' as const, width: 110,
      render: (id: string) => {
        const m = limiti[id] ?? 0;
        return m > 0 ? <Text type="secondary" style={{ fontSize: 11 }}>{EURO.format(m)}</Text> : null;
      },
    },
    {
      title: 'Importo previsto', dataIndex: 'importo_previsto', align: 'right' as const,
      render: (v: number, r: { voce_id: string }) => {
        const minVal = limiti[r.voce_id] ?? 0;
        return (
          <InputNumber
            value={v} min={minVal} precision={2} style={{ width: 140 }}
            status={v < minVal ? 'error' : undefined}
            onChange={val => setVoci(prev => prev.map(x =>
              x.voce_id === r.voce_id ? { ...x, importo_previsto: val ?? 0 } : x
            ))}
          />
        );
      },
    },
    {
      title: '', width: 50,
      render: (_: unknown, r: { voce_id: string }) => {
        const locked = (limiti[r.voce_id] ?? 0) > 0;
        return (
          <Button danger icon={<DeleteOutlined />} size="small" type="text"
            disabled={locked}
            title={locked ? 'Voce con spesa/impegno: non eliminabile' : undefined}
            onClick={() => setVoci(prev => prev.filter(x => x.voce_id !== r.voce_id))} />
        );
      },
    },
  ];

  return (
    <div>
      <div style={{
        marginBottom: 12, padding: '8px 12px', borderRadius: 6,
        background: totaleOK ? '#f6ffed' : '#fff7e6',
        border: `1px solid ${totaleOK ? '#b7eb8f' : '#ffa940'}`,
        display: 'flex', gap: 24, alignItems: 'center',
      }}>
        <span>Totale voci: <Text strong>{EURO.format(totaleVoci)}</Text></span>
        {costoTotale > 0 && <span>Costo progetto: <Text strong>{EURO.format(costoTotale)}</Text></span>}
        {!totaleOK && costoTotale > 0 && (
          <Text type={diff > 0 ? 'secondary' : 'danger'}>
            {diff > 0 ? `Non allocato: ${EURO.format(diff)}` : `Eccedenza: ${EURO.format(-diff)}`}
          </Text>
        )}
      </div>

      <Form form={form} layout="inline" style={{ marginBottom: 16 }}
        onFinish={v => {
          if (voci.find(x => x.voce_id === v.voce_id)) return;
          setVoci(prev => [...prev, { voce_id: v.voce_id, wp_id: null, importo_previsto: v.importo_previsto ?? 0 }]);
          form.resetFields();
        }}>
        <Form.Item name="voce_id" rules={[{ required: true }]} style={{ minWidth: 280 }}>
          <Select placeholder="Seleziona voce"
            open={selectOpen}
            onDropdownVisibleChange={setSelectOpen}
            dropdownRender={dropdownRender}
            options={(tutteVoci as { id: string; codice: string; descrizione: string }[] | undefined)
              ?.filter(v => !voci.find(x => x.voce_id === v.id))
              .map(v => ({ value: v.id, label: `${v.codice} — ${v.descrizione}` }))}
            showSearch filterOption={(inp, opt) =>
              (opt?.label as string)?.toLowerCase().includes(inp.toLowerCase())} />
        </Form.Item>
        <Form.Item name="importo_previsto" rules={[{ required: true }]}>
          <InputNumber min={0} precision={2} placeholder="Importo €" style={{ width: 140 }} />
        </Form.Item>
        <Button type="primary" icon={<PlusOutlined />} htmlType="submit">Aggiungi</Button>
      </Form>
      <Table columns={colonne} dataSource={voci} rowKey="voce_id" pagination={false} size="small" />
      <Divider />
      <Space align="center">
        <Button
          type="primary"
          onClick={() => salva()}
          loading={isPending}
          disabled={!totaleOK || hasVincolati}
        >
          Salva budget
        </Button>
        {!totaleOK && costoTotale > 0 && (
          <Alert type="warning" showIcon style={{ padding: '2px 10px' }}
            message="Il totale deve essere uguale al costo del progetto" />
        )}
      </Space>

      <Modal
        title="Crea nuova voce di costo"
        open={nuovaVoceAperta}
        onCancel={() => { setNuovaVoceAperta(false); nuovaVoceForm.resetFields(); }}
        onOk={() => nuovaVoceForm.submit()}
        confirmLoading={creaVocePending}
        okText="Crea" cancelText="Annulla"
        width={440}
      >
        <NuovaVoceForm form={nuovaVoceForm} onFinish={v => creaVoce(v)} />
      </Modal>
    </div>
  );
}

// ── Tab WP ────────────────────────────────────────────────────────────────────
function TabWpModifica({ progettoId }: { progettoId: string }) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalAperta, setModalAperta] = useState(false);
  const [wpInModifica, setWpInModifica] = useState<Record<string, unknown> | null>(null);

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId),
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
  });

  const { data: wps } = useQuery({
    queryKey: ['wp', progettoId],
    queryFn: () => progettiApi.wp.list(progettoId).then(r => r.data.data),
  });

  const { mutate: salvaWp, isPending } = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        progetto_id: progettoId,
        data_inizio: values.data_inizio ? dayjs(values.data_inizio as dayjs.Dayjs).format('YYYY-MM-DD') : null,
        data_fine: values.data_fine ? dayjs(values.data_fine as dayjs.Dayjs).format('YYYY-MM-DD') : null,
      };
      if (wpInModifica?.id) return progettiApi.wp.update(wpInModifica.id as string, payload);
      return progettiApi.wp.create(progettoId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wp', progettoId] });
      notification.success({ message: wpInModifica?.id ? 'WP aggiornato' : 'WP creato' });
      setModalAperta(false);
      setWpInModifica(null);
      form.resetFields();
    },
  });

  const { mutate: eliminaWp } = useMutation({
    mutationFn: (id: string) => progettiApi.wp.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wp', progettoId] });
      notification.success({ message: 'WP eliminato' });
    },
  });

  const apriModifica = (wp: Record<string, unknown>) => {
    setWpInModifica(wp);
    form.setFieldsValue({
      ...wp,
      data_inizio: wp.data_inizio ? dayjs(wp.data_inizio as string) : null,
      data_fine: wp.data_fine ? dayjs(wp.data_fine as string) : null,
    });
    setModalAperta(true);
  };

  const colonne = [
    { title: 'Codice', dataIndex: 'codice', width: 80 },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Inizio', dataIndex: 'data_inizio', width: 100, render: formatData },
    { title: 'Fine', dataIndex: 'data_fine', width: 100, render: formatData },
    {
      title: '', width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => apriModifica(r)} />
          <Button size="small" icon={<DeleteOutlined />} type="text" danger
            onClick={() => eliminaWp(r.id as string)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }}
        onClick={() => { setWpInModifica(null); form.resetFields(); setModalAperta(true); }}>
        Nuovo WP
      </Button>
      <Table columns={colonne} dataSource={(wps ?? []) as Record<string, unknown>[]} rowKey="id" pagination={false} size="small" />
      <Modal title={wpInModifica?.id ? 'Modifica WP' : 'Nuovo WP'}
        open={modalAperta} onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={isPending} okText="Salva">
        <Form form={form} layout="vertical" onFinish={salvaWp} style={{ marginTop: 12 }}>
          {progetto && (
            <Alert type="info" showIcon style={{ marginBottom: 16 }}
              message={`Periodo progetto: ${formatData(progetto.data_inizio)} → ${formatData(progetto.data_fine)}`} />
          )}
          <Row gutter={12}>
            <Col span={6}><Form.Item name="codice" label="Codice" rules={[{ required: true }]}><Input placeholder="WP1" /></Form.Item></Col>
            <Col span={18}><Form.Item name="titolo" label="Titolo" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="descrizione" label="Descrizione"><Input.TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col span={12}><Form.Item name="data_fine" label="Data fine" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ── Tab Allocazioni ───────────────────────────────────────────────────────────
function TabAllocazioniModifica({ progettoId }: { progettoId: string }) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalAperta, setModalAperta] = useState(false);
  const [allocInModifica, setAllocInModifica] = useState<Record<string, unknown> | null>(null);

  const { data: tutteLeAllocazioni } = useQuery({
    queryKey: queryKeys.progetti.allocazioni(progettoId),
    queryFn: () => progettiApi.allocazioni.list(progettoId).then(r => r.data.data),
  });
  // Solo le allocazioni di progetto (wp_id=null): le sotto-allocazioni WP si gestiscono nella tab "Personale WP"
  const allocazioni = (tutteLeAllocazioni as { wp_id: string | null }[] | undefined)
    ?.filter(a => a.wp_id === null || a.wp_id === undefined) ?? [];

  const RUOLI_NON_ALLOCABILI = new Set(['management', 'monitor', 'superadmin']);
  const { data: persone } = useQuery({
    queryKey: queryKeys.personale.list({ attivo: true }),
    queryFn: () => personaleApi.list({}).then(r =>
      (r.data.data as Array<{ id: string; nome: string; cognome: string; ruolo: string }>)
        .filter(p => !RUOLI_NON_ALLOCABILI.has(p.ruolo))
    ),
  });

  const { mutate: salvaAlloc, isPending } = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        data_inizio: dayjs(values.data_inizio as dayjs.Dayjs).format('YYYY-MM-DD'),
        data_fine: dayjs(values.data_fine as dayjs.Dayjs).format('YYYY-MM-DD'),
      };
      if (values.is_pi) {
        const allocs = await progettiApi.allocazioni.list(progettoId).then(r => r.data.data) as { is_pi: boolean; id: string }[];
        const piPrecedente = allocs.find(a => a.is_pi && a.id !== allocInModifica?.id);
        if (piPrecedente) {
          await progettiApi.allocazioni.update(progettoId, piPrecedente.id, { is_pi: false });
          notification.info({ message: "Ruolo PI rimosso dalla persona precedente" });
        }
      }
      if (allocInModifica?.id) {
        return progettiApi.allocazioni.update(progettoId, allocInModifica.id as string, payload);
      }
      return progettiApi.allocazioni.create(progettoId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.allocazioni(progettoId) });
      notification.success({ message: allocInModifica?.id ? 'Allocazione aggiornata' : 'Allocazione aggiunta' });
      setModalAperta(false);
      setAllocInModifica(null);
      form.resetFields();
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Errore' });
    },
  });

  const { mutate: eliminaAlloc } = useMutation({
    mutationFn: (id: string) => progettiApi.allocazioni.delete(progettoId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.allocazioni(progettoId) });
      notification.success({ message: 'Allocazione eliminata' });
    },
  });

  const apriModifica = (a: Record<string, unknown>) => {
    setAllocInModifica(a);
    form.setFieldsValue({
      ...a,
      data_inizio: a.data_inizio ? dayjs(a.data_inizio as string) : null,
      data_fine: a.data_fine ? dayjs(a.data_fine as string) : null,
    });
    setModalAperta(true);
  };

  const colonne = [
    {
      title: 'Persona', dataIndex: 'persona_id',
      render: (id: string) => {
        const p = persone?.find((x: { id: string }) => x.id === id);
        return p ? `${p.nome} ${p.cognome}` : id;
      },
    },
    { title: 'Ore', dataIndex: 'ore_assegnate', width: 80, render: formatOre },
    { title: 'PI', dataIndex: 'is_pi', width: 60,
      render: (v: boolean) => v ? <Tag color="green">PI</Tag> : null },
    { title: 'Ammin', dataIndex: 'is_ammin', width: 70,
      render: (v: boolean) => v ? <Tag color="orange">Ammin</Tag> : null },
    { title: 'Inizio', dataIndex: 'data_inizio', width: 100, render: formatData },
    { title: 'Fine', dataIndex: 'data_fine', width: 100, render: formatData },
    {
      title: '', width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => apriModifica(r)} />
          <Button size="small" icon={<DeleteOutlined />} type="text" danger
            onClick={() => eliminaAlloc(r.id as string)} />
        </Space>
      ),
    },
  ];

  const personeOptions = (persone as { id: string; nome: string; cognome: string }[] | undefined)
    ?.filter(p =>
      !(allocazioni as unknown as { persona_id: string; id: string }[] | undefined)?.find(a =>
        a.persona_id === p.id && a.id !== allocInModifica?.id
      )
    )
    .map(p => ({ value: p.id, label: `${p.nome} ${p.cognome}` })) ?? [];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }}
        onClick={() => { setAllocInModifica(null); form.resetFields(); setModalAperta(true); }}>
        Nuova allocazione
      </Button>
      <Table columns={colonne} dataSource={allocazioni as Record<string, unknown>[]} rowKey="id" pagination={false} size="small" />
      <Modal title={allocInModifica?.id ? 'Modifica allocazione' : 'Nuova allocazione'}
        open={modalAperta} onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={isPending} okText="Salva">
        <Form form={form} layout="vertical" onFinish={salvaAlloc} style={{ marginTop: 12 }}>
          <Form.Item name="persona_id" label="Persona" rules={[{ required: true }]}>
            <Select placeholder="Seleziona persona"
              options={personeOptions}
              showSearch filterOption={(inp, opt) =>
                (opt?.label as string)?.toLowerCase().includes(inp.toLowerCase())} />
          </Form.Item>
          <Form.Item name="ore_assegnate" label="Ore assegnate" rules={[{ required: true }]}>
            <InputNumber min={1} precision={1} style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col span={12}><Form.Item name="data_fine" label="Data fine" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          </Row>
          <Form.Item name="is_pi" label="PI del progetto" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <Form.Item name="is_ammin" label="Responsabile Amministrativo" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <Form.Item name="note" label="Note"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
