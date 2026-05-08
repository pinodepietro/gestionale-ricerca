// frontend/src/pages/admin/AdminPage.tsx
import { useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, Switch, Space,
         Typography, App, Popconfirm, Tag, Row, Col, Alert, Statistic, Card, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined,
         DownloadOutlined, CloudUploadOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

const { Title, Text } = Typography;

const RUOLI = [
  { value: 'amministrativo', label: 'Amministrativo' },
  { value: 'ricercatore', label: 'Ricercatore' },
  { value: 'management', label: 'Management' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'superadmin', label: 'Super Admin' },
];

const COLORI_RUOLO: Record<string, string> = {
  amministrativo: 'blue', ricercatore: 'default',
  management: 'orange', monitor: 'purple', superadmin: 'red',
};

function TabUtenti() {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [inModifica, setInModifica] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'utenti'],
    queryFn: () => apiClient.get<{ data: unknown[] }>('/admin/utenti').then(r => r.data.data),
  });

  const salva = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      inModifica?.id
        ? apiClient.patch(`/admin/utenti/${inModifica.id}`, values)
        : apiClient.post('/admin/utenti', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'utenti'] });
      notification.success({ message: inModifica?.id ? 'Utente aggiornato' : 'Utente creato' });
      setModalAperta(false); setInModifica(null); form.resetFields();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore';
      notification.error({ message: msg });
    },
  });

  const disattiva = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/utenti/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'utenti'] });
      notification.success({ message: 'Utente disattivato' });
    },
  });

  const apriModifica = (r: Record<string, unknown>) => {
    setInModifica(r);
    form.setFieldsValue({ ...r, password: '' });
    setModalAperta(true);
  };

  const colonne = [
    { title: 'Nome', key: 'nome',
      render: (_: unknown, r: Record<string, unknown>) => `${r.cognome} ${r.nome}` },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Ruolo', dataIndex: 'ruolo', width: 130,
      render: (v: string) => <Tag color={COLORI_RUOLO[v]}>{v}</Tag> },
    { title: 'Ruolo ente', dataIndex: 'ruolo_ente', width: 150 },
    { title: 'Attivo', dataIndex: 'attivo', width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Si' : 'No'}</Tag> },
    {
      title: '', width: 90,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => apriModifica(r)} />
          <Popconfirm title="Disattivare questo utente?"
            onConfirm={() => disattiva.mutate(r.id as string)}
            okText="Disattiva" cancelText="No" okButtonProps={{ danger: true }}>
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text strong>Utenti del sistema</Text>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setInModifica(null); form.resetFields(); setModalAperta(true); }}>
          Nuovo utente
        </Button>
      </div>
      <Table columns={colonne} dataSource={data as Record<string, unknown>[] ?? []}
        rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} size="small" />
      <Modal title={inModifica?.id ? 'Modifica utente' : 'Nuovo utente'}
        open={modalAperta}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={salva.isPending} okText="Salva" width={520}>
        <Form form={form} layout="vertical" onFinish={v => salva.mutate(v)} style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="nome" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cognome" label="Cognome" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="password" label={inModifica?.id ? 'Nuova password (vuoto = invariata)' : 'Password'}>
            <Input.Password />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="ruolo" label="Ruolo sistema" rules={[{ required: true }]}>
                <Select options={RUOLI} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ruolo_ente" label="Ruolo ente"><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="livello_contratto" label="Livello contratto"><Input /></Form.Item>
          {!!inModifica?.id && (
            <Form.Item name="attivo" label="Attivo" valuePropName="checked"><Switch /></Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

function TabTabelleDB() {
  const [tabellaSelezionata, setTabellaSelezionata] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const { data: tabelle } = useQuery({
    queryKey: ['admin', 'tabelle'],
    queryFn: () => apiClient.get<{ data: string[] }>('/admin/tabelle').then(r => r.data.data),
  });

  const { data: dati, isLoading } = useQuery({
    queryKey: ['admin', 'tabella', tabellaSelezionata, offset],
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number } }>(
      `/admin/tabelle/${tabellaSelezionata}?limit=${LIMIT}&offset=${offset}`
    ).then(r => r.data),
    enabled: !!tabellaSelezionata,
  });

  const colonne = dati?.data?.[0]
    ? Object.keys(dati.data[0] as Record<string, unknown>).map(k => ({
        title: k, dataIndex: k, ellipsis: true, width: 150,
        render: (v: unknown) => v === null
          ? <Text type="secondary">null</Text>
          : typeof v === 'boolean'
            ? <Tag color={v ? 'green' : 'red'}>{String(v)}</Tag>
            : String(v),
      }))
    : [];

  return (
    <div>
      <Alert type="warning" showIcon style={{ marginBottom: 16 }}
        message="Visualizzazione diretta — sola lettura" />
      <Space style={{ marginBottom: 16 }} wrap>
        {tabelle?.map(t => (
          <Button key={t} type={tabellaSelezionata === t ? 'primary' : 'default'}
            icon={<DatabaseOutlined />} size="small"
            onClick={() => { setTabellaSelezionata(t); setOffset(0); }}>
            {t}
          </Button>
        ))}
      </Space>
      {tabellaSelezionata && (
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            <Text strong>{tabellaSelezionata}</Text> — {dati?.meta?.total ?? 0} righe totali
          </Text>
          <Table
            columns={colonne}
            dataSource={dati?.data as Record<string, unknown>[] ?? []}
            rowKey={(r) => String((r as Record<string, unknown>).id ?? Math.random())}
            loading={isLoading}
            pagination={{
              current: offset / LIMIT + 1, pageSize: LIMIT, total: dati?.meta?.total ?? 0,
              onChange: (page) => setOffset((page - 1) * LIMIT),
            }}
            size="small" scroll={{ x: 'max-content' }}
          />
        </div>
      )}
    </div>
  );
}

function TabBackup() {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();

  const { data: backups, isLoading } = useQuery({
    queryKey: ['admin', 'backup'],
    queryFn: () => apiClient.get<{ data: unknown[] }>('/admin/backup').then(r => r.data.data),
  });

  const creaBackup = useMutation({
    mutationFn: () => apiClient.post('/admin/backup', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backup'] });
      notification.success({ message: 'Backup creato con successo' });
    },
    onError: () => notification.error({ message: 'Errore durante il backup' }),
  });

  const scarica = async (filename: string) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `http://localhost:8000/api/v1/admin/backup/${filename}/download`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) { notification.error({ message: 'Errore download' }); return; }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const colonne = [
    { title: 'File', dataIndex: 'filename' },
    { title: 'Dimensione', dataIndex: 'size', width: 120,
      render: (v: number) => `${(v / 1024).toFixed(1)} KB` },
    { title: 'Creato', dataIndex: 'created_at', width: 180,
      render: (v: string) => new Date(v).toLocaleString('it-IT') },
    { title: '', width: 100,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" icon={<DownloadOutlined />}
          onClick={() => scarica(r.filename as string)}>Scarica</Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text strong>Backup del database</Text>
        <Button type="primary" icon={<CloudUploadOutlined />}
          loading={creaBackup.isPending} onClick={() => creaBackup.mutate()}>
          Crea backup ora
        </Button>
      </div>
      <Table columns={colonne} dataSource={backups as Record<string, unknown>[] ?? []}
        rowKey="filename" loading={isLoading} pagination={false} size="small"
        locale={{ emptyText: 'Nessun backup disponibile' }} />
    </div>
  );
}

function TabNuoviProgetti() {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalAperta, setModalAperta] = useState(false);

  const { data: tuttiUtenti } = useQuery({
    queryKey: ['admin', 'utenti'],
    queryFn: () => apiClient.get<{ data: unknown[] }>('/admin/utenti').then(r => r.data.data as Record<string, unknown>[]),
  });
  const amministrativi = tuttiUtenti?.filter(u => u.ruolo === 'amministrativo' && u.attivo);

  const [modalModifica, setModalModifica] = useState(false);
  const [progettoInModifica, setProgettoInModifica] = useState<Record<string, unknown> | null>(null);
  const [formModifica] = Form.useForm();
  const [formNuovoAdmin] = Form.useForm();
  const [credenziali, setCredenziali] = useState<{ email: string; password: string } | null>(null);

  const modificaProgetto = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      apiClient.patch(`/progetti/${progettoInModifica?.id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'progetti-bozze'] });
      notification.success({ message: 'Progetto aggiornato' });
      setModalModifica(false);
      setProgettoInModifica(null);
      formModifica.resetFields();
    },
  });

  const eliminaProgetto = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/progetti/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'progetti-bozze'] });
      notification.success({ message: 'Progetto eliminato' });
    },
    onError: () => notification.error({ message: 'Errore eliminazione' }),
  });

  const { data: progetti, isLoading } = useQuery({
    queryKey: ['admin', 'progetti-bozze'],
    queryFn: () => apiClient.get<{ data: unknown[] }>('/progetti/bozze').then(r => r.data.data),
  });

  const crea = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      // Se è stato inserito un nuovo amministrativo, crealo prima
      let amministrativo_id = values.amministrativo_id;
      if (!amministrativo_id) {
        const nuovoAdmin = formNuovoAdmin.getFieldsValue();
        if (nuovoAdmin.nome && nuovoAdmin.email) {
          const pwd = nuovoAdmin.password || 'changeme123';
          const res = await apiClient.post<{ data: { id: string } }>('/admin/utenti', {
            nome: nuovoAdmin.nome,
            cognome: nuovoAdmin.cognome || '',
            email: nuovoAdmin.email,
            ruolo: 'amministrativo',
            password: pwd,
          });
          amministrativo_id = res.data.data.id;
          setCredenziali({ email: nuovoAdmin.email, password: pwd });
        }
      }
      if (!amministrativo_id) throw new Error('Seleziona o crea un amministrativo');
      return apiClient.post('/admin/progetti', { ...values, amministrativo_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'progetti-bozze'] });
      queryClient.invalidateQueries({ queryKey: ['progetti', 'bozze'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'utenti'] });
      notification.success({ message: "Progetto creato — l'amministrativo può ora completarlo" });
      setModalAperta(false);
      form.resetFields();
      formNuovoAdmin.resetFields();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore';
      notification.error({ message: msg });
    },
  });

  const colonne = [
    { title: 'Codice', dataIndex: 'codice', width: 130 },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Amministrativo', dataIndex: 'amministrativo_id', width: 180,
      render: (id: string) => {
        const a = (amministrativi as Record<string, unknown>[] ?? []).find(u => u.id === id);
        return a ? `${a.cognome} ${a.nome}` : <Text type="secondary">Non assegnato</Text>;
      }
    },
    { title: 'Stato', dataIndex: 'stato', width: 90,
      render: (v: string) => <Tag color="default">{v}</Tag> },
    {
      title: '', width: 100,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text"
            onClick={() => {
              setProgettoInModifica(r);
              formModifica.setFieldsValue({
                codice: r.codice,
                titolo: r.titolo,
                amministrativo_id: r.amministrativo_id,
              });
              setModalModifica(true);
            }} />
          <Popconfirm title="Eliminare questo progetto?"
            onConfirm={() => eliminaProgetto.mutate(r.id as string)}
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
        <Text strong>Progetti in configurazione</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)}>
          Nuovo progetto
        </Button>
      </div>
      <Table columns={colonne} dataSource={progetti as Record<string, unknown>[] ?? []}
        rowKey="id" loading={isLoading} pagination={false} size="small"
        locale={{ emptyText: 'Nessun progetto in configurazione' }} />

      <Modal title="Modifica progetto" open={modalModifica}
        onCancel={() => { setModalModifica(false); formModifica.resetFields(); }}
        onOk={() => formModifica.submit()} okText="Salva"
        confirmLoading={modificaProgetto.isPending} width={480}>
        <Form form={formModifica} layout="vertical"
          onFinish={v => modificaProgetto.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="codice" label="Codice progetto" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="titolo" label="Titolo progetto" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="amministrativo_id" label="Amministrativo responsabile">
            <Select
              placeholder="Seleziona amministrativo"
              showSearch allowClear
              options={amministrativi?.map((a: Record<string, unknown>) => ({
                value: a.id,
                label: `${a.cognome} ${a.nome} (${a.email})`,
              }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Nuovo amministrativo creato"
        open={!!credenziali}
        onCancel={() => setCredenziali(null)}
        onOk={() => setCredenziali(null)}
        okText="Ho preso nota"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={420}
      >
        <Alert type="success" showIcon style={{ marginBottom: 16 }}
          message="Amministrativo creato con successo" />
        <p>Comunica queste credenziali all'amministrativo:</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 12px', background: '#f5f5f5', fontWeight: 600, border: '1px solid #e0e0e0' }}>Email (username)</td>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', border: '1px solid #e0e0e0' }}>{credenziali?.email}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 12px', background: '#f5f5f5', fontWeight: 600, border: '1px solid #e0e0e0' }}>Password</td>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', border: '1px solid #e0e0e0' }}>{credenziali?.password}</td>
            </tr>
          </tbody>
        </table>
      </Modal>

      <Modal title="Nuovo progetto" open={modalAperta}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()} okText="Crea progetto"
        confirmLoading={crea.isPending} width={480}>
        <Form form={form} layout="vertical" onFinish={v => crea.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="codice" label="Codice progetto"
            help="Se non inserito, verrà generato automaticamente">
            <Input placeholder="es. PRIN2024_001" />
          </Form.Item>
          <Form.Item name="titolo" label="Titolo progetto">
            <Input.TextArea rows={2} placeholder="Titolo del progetto" />
          </Form.Item>
          <Form.Item label="Amministrativo responsabile" required>
            <Form.Item name="amministrativo_id" noStyle>
              <Select
                placeholder="Seleziona amministrativo esistente..."
                showSearch
                allowClear
                style={{ width: '100%', marginBottom: 8 }}
                options={amministrativi?.map((a: Record<string, unknown>) => ({
                  value: a.id,
                  label: `${a.cognome} ${a.nome} (${a.email})`,
                }))}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>oppure crea nuovo:</div>
            <Form form={formNuovoAdmin} layout="inline" style={{ gap: 4 }}>
              <Form.Item name="nome" style={{ marginBottom: 4 }}>
                <Input placeholder="Nome" style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="cognome" style={{ marginBottom: 4 }}>
                <Input placeholder="Cognome" style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="email" style={{ marginBottom: 4 }}>
                <Input placeholder="Email" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item name="password" style={{ marginBottom: 4 }}>
                <Input.Password placeholder="Password" style={{ width: 120 }} autoComplete="new-password" />
              </Form.Item>
            </Form>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function TabStatistiche() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'statistiche'],
    queryFn: () => apiClient.get<{ data: unknown }>('/admin/statistiche').then(r => r.data.data as Record<string, Record<string, unknown>>),
    refetchInterval: 30000,
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />;
  if (!data) return null;

  const p = data.progetti as Record<string, number>;
  const u = data.utenti as Record<string, unknown>;
  const t = data.timesheet as Record<string, number>;
  const s = data.spese as Record<string, number>;
  const per_ruolo = u.per_ruolo as Record<string, number>;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}><Card><Statistic title="Progetti attivi" value={p.attivi} suffix={`/ ${p.totale}`} valueStyle={{ color: '#185FA5' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Progetti in bozza" value={p.bozze} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Progetti chiusi" value={p.chiusi} valueStyle={{ color: '#888' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Utenti attivi" value={u.attivi as number} suffix={`/ ${u.totale as number}`} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={6}><Card><Statistic title="Timesheet questo mese" value={t.questo_mese} /></Card></Col>
        <Col span={6}><Card><Statistic title="Timesheet in attesa" value={t.in_attesa} valueStyle={{ color: t.in_attesa > 0 ? '#ff4d4f' : '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Spese registrate" value={s.totale_registrate} /></Card></Col>
        <Col span={6}><Card><Statistic title="Importo spese totale" value={s.importo_totale} precision={2} prefix="€" /></Card></Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Utenti per ruolo" size="small">
            <Row gutter={16}>
              {Object.entries(per_ruolo).map(([ruolo, count]) => (
                <Col key={ruolo} span={4}>
                  <Statistic title={ruolo} value={count as number} />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function TabLog() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'log'],
    queryFn: () => apiClient.get<{ data: unknown[] }>('/admin/log').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const colonne = [
    { title: 'Data/Ora', dataIndex: 'timestamp', width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('it-IT') : '—' },
    { title: 'Utente', dataIndex: 'utente', width: 150 },
    { title: 'Operazione', dataIndex: 'tipo', width: 160,
      render: (v: string) => {
        const colori: Record<string, string> = {
          timesheet_approvato: 'green', timesheet_rifiutato: 'red',
        };
        const label: Record<string, string> = {
          timesheet_approvato: 'TS Approvato', timesheet_rifiutato: 'TS Rifiutato',
        };
        return <Tag color={colori[v] ?? 'default'}>{label[v] ?? v}</Tag>;
      }
    },
    { title: 'Descrizione', dataIndex: 'descrizione', ellipsis: true },
  ];

  return (
    <Table
      columns={colonne}
      dataSource={data as Record<string, unknown>[] ?? []}
      rowKey="id"
      loading={isLoading}
      pagination={{ pageSize: 20 }}
      size="small"
      locale={{ emptyText: 'Nessuna operazione registrata' }}
    />
  );
}

function TabTuttiProgetti() {
  const { notification, modal } = App.useApp();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tutti-progetti'],
    queryFn: () => apiClient.get<{ data: unknown[] }>('/progetti?page_size=100&includi_bozze=true')
      .then(r => r.data.data),
  });

  const elimina = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/progetti/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tutti-progetti'] });
      queryClient.invalidateQueries({ queryKey: ['progetti'] });
      notification.success({ message: 'Progetto eliminato' });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore';
      notification.error({ message: msg });
    },
  });

  const handleElimina = (r: Record<string, unknown>) => {
    modal.confirm({
      title: 'Eliminare questo progetto?',
      content: (
        <div>
          <p>Stai per eliminare il progetto <strong>{r.codice as string} — {r.titolo as string}</strong>.</p>
          <p style={{ color: '#ff4d4f' }}>Questa operazione è irreversibile e cancellerà tutti i dati associati (WP, timesheet, SAL, spese, documenti).</p>
        </div>
      ),
      okText: 'Sì, elimina',
      okType: 'danger',
      cancelText: 'Annulla',
      onOk() {
        modal.confirm({
          title: 'Conferma definitiva',
          content: <p>Sei sicuro? I dati non potranno essere recuperati.</p>,
          okText: 'Elimina definitivamente',
          okType: 'danger',
          cancelText: 'Annulla',
          onOk() {
            elimina.mutate(r.id as string);
          },
        });
      },
    });
  };

  const COLORI_STATO: Record<string, string> = {
    bozza: 'default', attivo: 'green', chiuso: 'orange', rendicontato: 'purple',
  };

  const colonne = [
    { title: 'Codice', dataIndex: 'codice', width: 120 },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Tipo', dataIndex: 'tipo', width: 100 },
    { title: 'Stato', dataIndex: 'stato', width: 100,
      render: (v: string) => <Tag color={COLORI_STATO[v] ?? 'default'}>{v}</Tag> },
    { title: '', width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" danger icon={<DeleteOutlined />}
          onClick={() => handleElimina(r)}>
          Elimina
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Alert type="warning" showIcon style={{ marginBottom: 16 }}
        message="Attenzione: l'eliminazione è irreversibile e cancella tutti i dati del progetto." />
      <Table columns={colonne} dataSource={data as Record<string, unknown>[] ?? []}
        rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} size="small" />
    </div>
  );
}

export function AdminPage() {
  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 8 }} />
        Amministrazione sistema
      </Title>
      <Tabs items={[
        { key: 'utenti', label: 'Gestione utenti', children: <TabUtenti /> },
        { key: 'backup', label: 'Backup', children: <TabBackup /> },
        { key: 'progetti', label: 'Nuovi progetti', children: <TabNuoviProgetti /> },
        { key: 'tutti-progetti', label: 'Tutti i progetti', children: <TabTuttiProgetti /> },
        { key: 'statistiche', label: 'Statistiche', children: <TabStatistiche /> },
        { key: 'log', label: 'Log operazioni', children: <TabLog /> },
        { key: 'tabelle', label: 'DB Tabelle', children: <TabTabelleDB /> },
      ]} />
    </div>
  );
}
