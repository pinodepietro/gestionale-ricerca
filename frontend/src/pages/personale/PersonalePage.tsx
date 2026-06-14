import { useState } from 'react';
import { Table, Input, Switch, Button, Space, Typography, Row, Col, Tag, Modal, Form, Select, DatePicker, App } from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personaleApi } from '../../api/personale';
import { useAuthStore } from '../../store/useAuthStore';
import { queryKeys } from '../../utils/queryKeys';
import { formatData } from '../../utils/formatters';
import { RbacGuard } from '../../components/common/RbacGuard';
import type { Persona } from '../../types/personale';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const RUOLI_OPTIONS = [
  { value: 'amministrativo', label: 'Amministrativo' },
  { value: 'ricercatore', label: 'Ricercatore' },
  { value: 'management', label: 'Management' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'direttore_generale', label: 'Direttore Generale' },
  { value: 'superadmin', label: 'Super Admin' },
];

export function PersonalePage() {
  const navigate = useNavigate();
  const { notification, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [soloAttivi, setSoloAttivi] = useState(true);
  const [page, setPage] = useState(1);
  const [modalAperta, setModalAperta] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.personale.list({ search, attivo: soloAttivi }),
    queryFn: () => personaleApi.list({ search, attivo: soloAttivi }).then(r => r.data),
  });

  const user = useAuthStore(s => s.user);

  const { mutate: eliminaPersona } = useMutation({
    mutationFn: (id: string) => personaleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.all });
      notification.success({ message: 'Persona eliminata definitivamente' });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore';
      notification.error({ message: msg });
    },
  });

  const { mutate: disattivaPersona } = useMutation({
    mutationFn: (id: string) => personaleApi.update(id, { attivo: false } as Record<string, unknown>).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.all });
      notification.success({ message: 'Persona disattivata' });
    },
  });

  const { mutate: creaPersona, isPending } = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        data_inizio_servizio: values.data_inizio_servizio
          ? dayjs(values.data_inizio_servizio as string).format('YYYY-MM-DD')
          : undefined,
      };
      return personaleApi.create(payload).then(r => r.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.all });
      setModalAperta(false);
      form.resetFields();
    },
  });

  const columns = [
    {
      title: 'Cognome e Nome',
      render: (_: unknown, r: Persona) => (
        <a onClick={() => navigate(`/personale/${r.id}`)}>
          {r.cognome} {r.nome}
        </a>
      ),
    },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Ruolo sistema', dataIndex: 'ruolo', width: 130,
      render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Ruolo ente', dataIndex: 'ruolo_ente', width: 160 },
    { title: 'Contratto', dataIndex: 'livello_contratto', width: 120 },
    { title: 'In servizio dal', dataIndex: 'data_inizio_servizio', width: 130, render: formatData },
    { title: 'Attivo', dataIndex: 'attivo', width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Sì' : 'No'}</Tag> },
    {
      title: '', width: 100,
      render: (_: unknown, r: Persona) => (
        <RbacGuard azione="personale:gestisci">
          <Space onClick={e => e.stopPropagation()}>
            <Button size="small" type="text"
              onClick={() => navigate(`/personale/${r.id}`)}>
              Modifica
            </Button>
            {user?.ruolo === 'superadmin' ? (
              <Button size="small" icon={<DeleteOutlined />} type="text" danger
                onClick={() => {
                  modal.confirm({
                    title: 'Eliminare definitivamente questa persona?',
                    content: `${r.cognome} ${r.nome} verra eliminato dal sistema. Se ha allocazioni attive o timesheet pendenti non sara possibile eliminarlo.`,
                    okText: 'Si, elimina',
                    okType: 'danger',
                    cancelText: 'Annulla',
                    onOk() {
                      modal.confirm({
                        title: 'Conferma definitiva',
                        content: 'Attenzione: questa operazione e irreversibile. Tutti i dati della persona verranno eliminati.',
                        okText: 'Elimina definitivamente',
                        okType: 'danger',
                        cancelText: 'Indietro',
                        onOk() { eliminaPersona(r.id); },
                      });
                    },
                  });
                }} />
            ) : (
              r.attivo && (
                <Button size="small" icon={<StopOutlined />} type="text" danger
                  onClick={() => {
                    modal.confirm({
                      title: 'Disattivare questa persona?',
                      content: `${r.cognome} ${r.nome} non potra piu accedere al sistema.`,
                      okText: 'Si, disattiva',
                      okType: 'danger',
                      cancelText: 'Annulla',
                      onOk() {
                        modal.confirm({
                          title: 'Conferma definitiva',
                          content: 'Sei sicuro di voler disattivare questa persona?',
                          okText: 'Disattiva',
                          okType: 'danger',
                          cancelText: 'Indietro',
                          onOk() { disattivaPersona(r.id); },
                        });
                      },
                    });
                  }} />
              )
            )}
          </Space>
        </RbacGuard>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={2} style={{ margin: 0 }}>Personale</Title></Col>
        <Col>
          <RbacGuard azione="personale:gestisci">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)}>
              Nuova persona
            </Button>
          </RbacGuard>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Cerca per nome, cognome, email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 300 }}
          allowClear
        />
        <Space>
          <Text>Solo attivi</Text>
          <Switch checked={soloAttivi} onChange={v => { setSoloAttivi(v); setPage(1); }} />
        </Space>
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
          showTotal: t => `${t} persone`,
        }}
        onRow={r => ({ onClick: () => navigate(`/personale/${r.id}`) })}
      />

      <Modal
        open={modalAperta}
        title={<Space><UserOutlined /> Nuova persona</Space>}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={isPending}
        okText="Salva"
        cancelText="Annulla"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={creaPersona} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nome" label="Nome" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cognome" label="Cognome" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email non valida' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password iniziale" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input.Password />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ruolo" label="Ruolo nel sistema" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <Select options={RUOLI_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ruolo_ente" label="Ruolo nell'ente">
                <Input placeholder="es. Ricercatore, Tecnico, Dottorando" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="livello_contratto" label="Livello contratto">
                <Input placeholder="es. RTD-A, PA, PO, TD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="codice_fiscale" label="Codice fiscale">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="data_inizio_servizio" label="In servizio dal">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
