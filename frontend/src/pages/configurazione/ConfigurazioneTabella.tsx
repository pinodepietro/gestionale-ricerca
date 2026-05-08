// frontend/src/pages/configurazione/ConfigurazioneTabella.tsx
import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Switch,
         Typography, App, Popconfirm, Tag, Divider, Upload, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../utils/queryKeys';

const { Title, Text } = Typography;

const CATEGORIE_VOCE = [
  { value: 'personale', label: 'Personale' },
  { value: 'materiali', label: 'Materiali' },
  { value: 'servizi', label: 'Servizi' },
  { value: 'missioni', label: 'Missioni' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'altro', label: 'Altro' },
];

export function VociDiCostoPage() {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [inModifica, setInModifica] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.config.vociDiCosto,
    queryFn: () => apiClient.get<{ data: unknown[] }>('/voci-di-costo').then(r => r.data.data),
  });

  const salva = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      inModifica?.id
        ? apiClient.patch(`/voci-di-costo/${inModifica.id}`, values)
        : apiClient.post('/voci-di-costo', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.vociDiCosto });
      notification.success({ message: inModifica?.id ? 'Voce aggiornata' : 'Voce creata' });
      setModalAperta(false);
      setInModifica(null);
      form.resetFields();
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Errore' });
    },
  });

  const elimina = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/voci-di-costo/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.vociDiCosto });
      notification.success({ message: 'Voce eliminata' });
    },
  });

  const apriModifica = (r: Record<string, unknown>) => {
    setInModifica(r);
    form.setFieldsValue(r);
    setModalAperta(true);
  };

  const colonne = [
    { title: 'Codice', dataIndex: 'codice', width: 100 },
    { title: 'Descrizione', dataIndex: 'descrizione', ellipsis: true },
    { title: 'Categoria', dataIndex: 'categoria', width: 120, render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Horizon', dataIndex: 'ammissibile_horizon', width: 80, render: (v: boolean) => v ? <Tag color="green">Si</Tag> : <Tag>No</Tag> },
    { title: 'PNRR', dataIndex: 'ammissibile_pnrr', width: 70, render: (v: boolean) => v ? <Tag color="green">Si</Tag> : <Tag>No</Tag> },
    { title: 'POR', dataIndex: 'ammissibile_por', width: 70, render: (v: boolean) => v ? <Tag color="green">Si</Tag> : <Tag>No</Tag> },
    {
      title: '', key: 'azioni', width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => apriModifica(r)} />
          <Popconfirm title="Eliminare questa voce?" onConfirm={() => elimina.mutate(r.id as string)}
            okText="Elimina" cancelText="No" okButtonProps={{ danger: true }}>
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Voci di costo</Title>
          <Text type="secondary">Categorie di spesa utilizzate nei budget dei progetti</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setInModifica(null); form.resetFields(); setModalAperta(true); }}>
          Nuova voce
        </Button>
      </div>

      <Table columns={colonne} dataSource={data as Record<string, unknown>[] ?? []}
        rowKey="id" loading={isLoading} pagination={false} size="small" />

      <Modal
        title={inModifica?.id ? 'Modifica voce di costo' : 'Nuova voce di costo'}
        open={modalAperta}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={salva.isPending}
        okText="Salva"
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={v => salva.mutate(v)} style={{ marginTop: 16 }}>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="codice" label="Codice" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="es. A.1" />
            </Form.Item>
            <Form.Item name="categoria" label="Categoria" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Select options={CATEGORIE_VOCE} />
            </Form.Item>
          </Space>
          <Form.Item name="descrizione" label="Descrizione" rules={[{ required: true }]}>
            <Input placeholder="es. Personale dipendente" />
          </Form.Item>
          <Divider>Ammissibilita per tipo finanziamento</Divider>
          <Space size={24}>
            <Form.Item name="ammissibile_horizon" label="Horizon Europe" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="ammissibile_pnrr" label="PNRR" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="ammissibile_por" label="POR/FESR" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}

export function TipiProgettaPage() {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [inModifica, setInModifica] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['config', 'tipi-progetto'],
    queryFn: () => apiClient.get<{ data: unknown[] }>('/tipi-progetto').then(r => r.data.data),
  });

  const salva = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      inModifica?.id
        ? apiClient.patch(`/tipi-progetto/${inModifica.id}`, values)
        : apiClient.post('/tipi-progetto', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'tipi-progetto'] });
      notification.success({ message: inModifica?.id ? 'Tipo aggiornato' : 'Tipo creato' });
      setModalAperta(false);
      setInModifica(null);
      form.resetFields();
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Errore' });
    },
  });

  const elimina = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tipi-progetto/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'tipi-progetto'] });
      notification.success({ message: 'Tipo eliminato' });
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Impossibile eliminare: probabilmente usato da un progetto' });
    },
  });

  const apriModifica = (r: Record<string, unknown>) => {
    setInModifica(r);
    form.setFieldsValue(r);
    setModalAperta(true);
  };

  const colonne = [
    { title: 'Nome', dataIndex: 'nome', ellipsis: true },
    {
      title: '', key: 'azioni', width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => apriModifica(r)} />
          <Popconfirm title="Eliminare questo tipo?" onConfirm={() => elimina.mutate(r.id as string)}
            okText="Elimina" cancelText="No" okButtonProps={{ danger: true }}>
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Tipologie di progetto</Title>
          <Text type="secondary">Tipi di finanziamento/progetto selezionabili durante la configurazione</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setInModifica(null); form.resetFields(); setModalAperta(true); }}>
          Nuovo tipo
        </Button>
      </div>

      <Table columns={colonne} dataSource={data as Record<string, unknown>[] ?? []}
        rowKey="id" loading={isLoading} pagination={false} size="small" />

      <Modal
        title={inModifica?.id ? 'Modifica tipologia' : 'Nuova tipologia di progetto'}
        open={modalAperta}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={salva.isPending}
        okText="Salva"
        width={400}
      >
        <Form form={form} layout="vertical" onFinish={v => salva.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="nome" label="Nome" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input placeholder="es. PON, FESR, Contratto conto terzi" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export function TemplateTimesheetPage() {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [inModifica, setInModifica] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.config.templateTimesheet,
    queryFn: () => apiClient.get<{ data: unknown[] }>('/template-timesheet').then(r => r.data.data),
  });

  const salva = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      inModifica?.id
        ? apiClient.patch(`/template-timesheet/${inModifica.id}`, values)
        : apiClient.post('/template-timesheet', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.templateTimesheet });
      notification.success({ message: inModifica?.id ? 'Template aggiornato' : 'Template creato' });
      setModalAperta(false);
      setInModifica(null);
      form.resetFields();
    },
  });

  const elimina = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/template-timesheet/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.templateTimesheet });
      notification.success({ message: 'Template eliminato' });
    },
  });

  const apriModifica = (r: Record<string, unknown>) => {
    setInModifica(r);
    form.setFieldsValue(r);
    setModalAperta(true);
  };

  const handleUpload = (file: File, templateId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    apiClient.post(`/template-timesheet/${templateId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.config.templateTimesheet });
        notification.success({ message: 'Template Excel caricato' });
      })
      .catch(() => notification.error({ message: 'Errore durante il caricamento' }));
    return false;
  };

  const colonne = [
    { title: 'Nome', dataIndex: 'nome', ellipsis: true },
    {
      title: 'Granularita', dataIndex: 'granularita', width: 110,
      render: (v: string) => <Tag color={v === 'giornaliero' ? 'blue' : 'default'}>{v}</Tag>,
    },
    { title: 'Firmatari', dataIndex: 'num_firmatari', width: 90, align: 'center' as const },
    {
      title: 'Righe WP', dataIndex: 'righe_wp_task', width: 90,
      render: (v: boolean) => v ? <Tag color="green">Si</Tag> : <Tag>No</Tag>,
    },
    {
      title: 'File ente', key: 'file', width: 120,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Upload
          accept=".xlsx"
          showUploadList={false}
          beforeUpload={(file) => handleUpload(file as File, r.id as string)}
        >
          <Tooltip title={r.file_template_path ? 'Sostituisci file template' : 'Carica file template ente (.xlsx)'}>
            <Button
              size="small"
              icon={<UploadOutlined />}
              type={r.file_template_path ? 'primary' : 'default'}
              ghost={!!r.file_template_path}
            >
              {r.file_template_path ? 'Sost.' : 'Carica'}
            </Button>
          </Tooltip>
        </Upload>
      ),
    },
    {
      title: '', key: 'azioni', width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => apriModifica(r)} />
          <Popconfirm title="Eliminare questo template?" onConfirm={() => elimina.mutate(r.id as string)}
            okText="Elimina" cancelText="No" okButtonProps={{ danger: true }}>
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Template Timesheet</Title>
          <Text type="secondary">Configurazione dei formati di rendicontazione ore per tipo finanziamento</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setInModifica(null); form.resetFields(); setModalAperta(true); }}>
          Nuovo template
        </Button>
      </div>

      <Table columns={colonne} dataSource={data as Record<string, unknown>[] ?? []}
        rowKey="id" loading={isLoading} pagination={false} size="small" />

      <Modal
        title={inModifica?.id ? 'Modifica template' : 'Nuovo template timesheet'}
        open={modalAperta}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={salva.isPending}
        okText="Salva"
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={v => salva.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="nome" label="Nome template" rules={[{ required: true }]}>
            <Input placeholder="es. POR FESR Campania, MISE 5G" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="granularita" label="Granularita" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[
                { value: 'mensile', label: 'Mensile' },
                { value: 'giornaliero', label: 'Giornaliero' },
              ]} />
            </Form.Item>
            <Form.Item name="num_firmatari" label="Numero firmatari" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[
                { value: 1, label: '1 firmatario' },
                { value: 2, label: '2 firmatari' },
                { value: 3, label: '3 firmatari' },
              ]} />
            </Form.Item>
          </Space>
          <Divider>Etichette firmatari</Divider>
          <Form.Item name="etichetta_firmatario_1" label="Firmatario 1" rules={[{ required: true }]}>
            <Input placeholder="es. Firma Dipendente" />
          </Form.Item>
          <Form.Item name="etichetta_firmatario_2" label="Firmatario 2">
            <Input placeholder="es. Firma Responsabile Amministrativo" />
          </Form.Item>
          <Form.Item name="etichetta_firmatario_3" label="Firmatario 3 (opzionale)">
            <Input placeholder="es. Firma Direttore d'Istituto" />
          </Form.Item>
          <Divider>Righe da mostrare</Divider>
          <Space size={24} wrap>
            <Form.Item name="righe_wp_task" label="Righe WP/Task" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="riga_altri_progetti" label="Altri progetti" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="riga_ordinaria" label="Attivita ordinaria" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="riga_assenze" label="Assenze" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
