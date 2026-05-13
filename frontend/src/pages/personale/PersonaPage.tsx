import { useState } from 'react';
import { Tabs, Typography, Spin, Button, Space, Descriptions, Tag, Table, Modal, Form, Input, InputNumber, DatePicker, Row, Col, Select, Switch } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personaleApi } from '../../api/personale';
import { progettiApi } from '../../api/progetti';
import { timesheetApi } from '../../api/timesheet';
import { queryKeys } from '../../utils/queryKeys';
import { formatData, formatEuro, formatOre } from '../../utils/formatters';
import { RbacGuard } from '../../components/common/RbacGuard';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const ANNO_CORRENTE = new Date().getFullYear();

export function PersonaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalCosto, setModalCosto] = useState(false);
  const [modalAnagrafica, setModalAnagrafica] = useState(false);
  const [formAnagrafica] = Form.useForm();
  const [modalPassword, setModalPassword] = useState(false);
  const [formPassword] = Form.useForm();
  const [modalMonte, setModalMonte] = useState(false);
  const [formCosto] = Form.useForm();
  const [formMonte] = Form.useForm();

  const { data: persona, isLoading } = useQuery({
    queryKey: queryKeys.personale.detail(id!),
    queryFn: () => personaleApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: costiOrari } = useQuery({
    queryKey: queryKeys.personale.costiOrari(id!),
    queryFn: () => personaleApi.costiOrari.list(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: monteOre } = useQuery({
    queryKey: queryKeys.personale.monteOre(id!),
    queryFn: () => personaleApi.monteOre.list(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const { mutate: toggleAttivo } = useMutation({
    mutationFn: (attivo: boolean) => personaleApi.update(id!, { attivo } as Record<string, unknown>).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.all });
    },
  });

  const { mutate: modificaAnagrafica, isPending: salvandoAnagrafica } = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        data_inizio_servizio: values.data_inizio_servizio
          ? dayjs(values.data_inizio_servizio as string).format('YYYY-MM-DD')
          : undefined,
      };
      return personaleApi.update(id!, payload as Record<string, unknown>).then(r => r.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.all });
      setModalAnagrafica(false);
      formAnagrafica.resetFields();
    },
  });

  const { mutate: reimpostaPassword, isPending: salvandoPassword } = useMutation({
    mutationFn: (values: { password: string }) =>
      personaleApi.update(id!, { password: values.password } as Record<string, unknown>),
    onSuccess: () => {
      setModalPassword(false);
      formPassword.resetFields();
    },
  });

  const { mutate: inserisciCosto, isPending: caricandoCosto } = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      personaleApi.costiOrari.create(id!, {
        ...values,
        data_inizio: dayjs(values.data_inizio as string).format('YYYY-MM-DD'),
      }).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.costiOrari(id!) });
      setModalCosto(false);
      formCosto.resetFields();
    },
  });

  const { mutate: upsertMonte, isPending: caricandoMonte } = useMutation({
    mutationFn: (values: { anno: number; ore_disponibili: number }) =>
      personaleApi.monteOre.upsert(id!, values.anno, { ore_disponibili: values.ore_disponibili })
        .then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.monteOre(id!) });
      setModalMonte(false);
      formMonte.resetFields();
    },
  });


  const { data: progettiPersona } = useQuery({
    queryKey: ['progetti', 'tutti'],
    queryFn: () => progettiApi.list({}).then(r => r.data.data),
  });

  const { data: timesheetPersona } = useQuery({
    queryKey: ['timesheet', 'persona', id],
    queryFn: () => timesheetApi.list({ persona_id: id }).then(r => r.data.data),
    enabled: !!id,
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!persona) return <Text type="danger">Persona non trovata.</Text>;

  const colonneCoste = [
    { title: 'Costo orario (€/h)', dataIndex: 'costo_orario', render: (v: number) => formatEuro(v) },
    { title: 'Dal', dataIndex: 'data_inizio', render: formatData },
    { title: 'Al', dataIndex: 'data_fine', render: (v: string) => v ? formatData(v) : <Tag color="green">In vigore</Tag> },
    { title: 'Motivazione', dataIndex: 'motivazione', ellipsis: true },
  ];

  const colonneMonte = [
    { title: 'Anno', dataIndex: 'anno', width: 80 },
    { title: 'Ore disponibili', dataIndex: 'ore_disponibili', render: formatOre },
    { title: 'Ore allocate', dataIndex: 'ore_allocate', render: formatOre },
    { title: 'Ore residue', dataIndex: 'ore_residue', render: (v: number) => (
      <Tag color={v < 0 ? 'red' : v < 100 ? 'orange' : 'green'}>{formatOre(v)}</Tag>
    )},
    {
      title: 'Ore residue',
      dataIndex: 'ore_residue',
      render: (v: number) => <Text type={v < 0 ? 'danger' : undefined}>{formatOre(v)}</Text>,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => navigate('/personale')}>
          Tutto il personale
        </Button>
      </Space>

      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            {persona.cognome} {persona.nome}
          </Title>
          <Space style={{ marginTop: 4 }}>
            <Tag>{persona.ruolo}</Tag>
            <Tag color={persona.attivo ? 'green' : 'red'}>{persona.attivo ? 'Attivo' : 'Non attivo'}</Tag>
          </Space>
        </Col>
      </Row>

      <Tabs defaultActiveKey="anagrafica" items={[
        {
          key: 'anagrafica',
          label: 'Anagrafica',
          children: (
            <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Space>
                <Text type="secondary">Stato account:</Text>
                <RbacGuard azione="personale:gestisci">
                  <Switch
                    checked={persona.attivo}
                    checkedChildren="Attivo"
                    unCheckedChildren="Disattivo"
                    onChange={(val) => toggleAttivo(val)}
                  />
                </RbacGuard>
              </Space>
              <RbacGuard azione="personale:gestisci">
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => {
                    formAnagrafica.setFieldsValue({
                      ...persona,
                      data_inizio_servizio: persona.data_inizio_servizio ? dayjs(persona.data_inizio_servizio) : null,
                    });
                    setModalAnagrafica(true);
                  }}>Modifica anagrafica</Button>
                  <Button onClick={() => setModalPassword(true)}>Reimposta password</Button>
                </Space>
              </RbacGuard>
            </div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Email">{persona.email}</Descriptions.Item>
              <Descriptions.Item label="Codice fiscale">{persona.codice_fiscale ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Ruolo ente">{persona.ruolo_ente ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Livello contratto">{persona.livello_contratto ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="In servizio dal">{formatData(persona.data_inizio_servizio)}</Descriptions.Item>
            </Descriptions>
            </>
          ),
        },
        {
          key: 'costi',
          label: 'Costi orari',
          children: (
            <>
              <RbacGuard azione="personale:gestisci">
                <Button
                  type="primary" icon={<PlusOutlined />}
                  style={{ marginBottom: 16 }}
                  onClick={() => setModalCosto(true)}
                >
                  Nuovo costo orario
                </Button>
              </RbacGuard>
              <Table
                columns={colonneCoste}
                dataSource={costiOrari ?? []}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </>
          ),
        },
        {
          key: 'monte',
          label: 'Monte ore',
          children: (
            <>
              <RbacGuard azione="personale:gestisci">
                <Button
                  type="primary" icon={<PlusOutlined />}
                  style={{ marginBottom: 16 }}
                  onClick={() => {
                    formMonte.setFieldsValue({ anno: ANNO_CORRENTE });
                    setModalMonte(true);
                  }}
                >
                  Imposta monte ore
                </Button>
              </RbacGuard>
              <Table
                columns={colonneMonte}
                dataSource={monteOre ?? []}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </>
          ),
        },
        {
          key: 'timesheet',
          label: 'Timesheet',
          children: (
            <Table
              columns={[
                { title: 'Mese/Anno', key: 'periodo',
                  render: (_: unknown, r: { mese: number; anno: number }) =>
                    `${String(r.mese).padStart(2,'0')}/${r.anno}` },
                { title: 'Progetto', dataIndex: 'progetto_id', ellipsis: true,
                  render: (id: string) => {
                    const p = progettiPersona?.find((x: { id: string }) => x.id === id);
                    return p ? `${p.acronimo || p.codice} — ${p.titolo}` : id;
                  }
                },
                { title: 'Ore progetto', dataIndex: 'ore_totali_progetto',
                  render: (v: number) => v ? `${v}h` : '—' },
                { title: 'Stato', dataIndex: 'stato', width: 110,
                  render: (v: string) => (
                    <Tag color={v === 'approvato' ? 'green' : v === 'inviato' ? 'blue' :
                      v === 'rifiutato' ? 'red' : 'default'}>{v}</Tag>
                  )},
              ]}
              dataSource={timesheetPersona ?? []}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
              locale={{ emptyText: 'Nessun timesheet' }}
            />
          ),
        },
      ]} />

      <Modal
        title="Modifica anagrafica"
        open={modalAnagrafica}
        onCancel={() => { setModalAnagrafica(false); formAnagrafica.resetFields(); }}
        onOk={() => formAnagrafica.submit()}
        confirmLoading={salvandoAnagrafica}
        okText="Salva"
        width={520}
      >
        <Form form={formAnagrafica} layout="vertical" onFinish={v => modificaAnagrafica(v)} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nome" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cognome" label="Cognome" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ruolo" label="Ruolo sistema" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'amministrativo', label: 'Amministrativo' },
                  { value: 'ricercatore', label: 'Ricercatore' },
                  { value: 'management', label: 'Management' },
                  { value: 'monitor', label: 'Monitor' },
                  { value: 'superadmin', label: 'Super Admin' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ruolo_ente" label="Ruolo ente"><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="livello_contratto" label="Livello contratto"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="codice_fiscale" label="Codice fiscale"><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="data_inizio_servizio" label="In servizio dal">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={modalCosto}
        title="Nuovo costo orario"
        onCancel={() => { setModalCosto(false); formCosto.resetFields(); }}
        onOk={() => formCosto.submit()}
        confirmLoading={caricandoCosto}
        okText="Salva"
        cancelText="Annulla"
      >
        <Form form={formCosto} layout="vertical" onFinish={inserisciCosto} style={{ marginTop: 16 }}>
          <Form.Item name="costo_orario" label="Costo orario (€/h)" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="data_inizio" label="Valido dal" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="motivazione" label="Motivazione">
            <Input placeholder="es. Progressione RTD-A → RTD-B, Rinnovo 2024" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={modalMonte}
        title="Imposta monte ore annuale"
        onCancel={() => { setModalMonte(false); formMonte.resetFields(); }}
        onOk={() => formMonte.submit()}
        confirmLoading={caricandoMonte}
        okText="Salva"
        cancelText="Annulla"
      >
        <Form form={formMonte} layout="vertical" onFinish={upsertMonte} style={{ marginTop: 16 }}>
          <Form.Item name="anno" label="Anno" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <InputNumber min={2020} max={2100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ore_disponibili" label="Ore disponibili" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="es. 1506" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={modalPassword}
        title="Reimposta password"
        onCancel={() => { setModalPassword(false); formPassword.resetFields(); }}
        onOk={() => formPassword.submit()}
        confirmLoading={salvandoPassword}
        okText="Salva"
        cancelText="Annulla"
        width={400}
      >
        <Form form={formPassword} layout="vertical" onFinish={reimpostaPassword} style={{ marginTop: 16 }}>
          <Form.Item
            name="password"
            label="Nuova password"
            rules={[{ required: true, message: 'Obbligatorio' }, { min: 8, message: 'Minimo 8 caratteri' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="conferma"
            label="Conferma password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Obbligatorio' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Le password non coincidono'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
