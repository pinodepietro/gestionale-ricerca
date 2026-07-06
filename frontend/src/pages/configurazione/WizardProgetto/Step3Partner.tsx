import { useState } from 'react';
import { Form, Select, Button, Table, Space, Typography, Divider, Row, Col, Tag, Modal, Input, App } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { configApi } from '../../../api/config';
import { queryKeys } from '../../../utils/queryKeys';
import { apiClient } from '../../../api/client';

const { Title } = Typography;

interface Props {
  progettoId: string;
  onCompletato: () => void;
  onIndietro: () => void;
}

export function Step3Partner({ progettoId, onCompletato, onIndietro }: Props) {
  const [form] = Form.useForm();
  const [formNuovoEnte] = Form.useForm();
  const [modalNuovoEnte, setModalNuovoEnte] = useState(false);
  const { notification } = App.useApp();
  const queryClient = useQueryClient();

  const { data: partners } = useQuery({
    queryKey: queryKeys.config.partner,
    queryFn: () => configApi.partner().then(r => r.data.data),
  });

  const { data: partnerProgetto } = useQuery({
    queryKey: ['progetti', progettoId, 'partner'],
    queryFn: () => progettiApi.partner.list(progettoId).then(r => r.data.data),
  });

  const { mutate: aggiungi, isPending } = useMutation({
    mutationFn: (values: { partner_id: string; ruolo: string }) =>
      progettiApi.partner.add(progettoId, values).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'partner'] });
      form.resetFields();
    },
  });

  const { mutate: rimuovi } = useMutation({
    mutationFn: (ppId: string) => progettiApi.partner.remove(progettoId, ppId).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'partner'] }),
  });

  const { mutate: creaNuovoEnte, isPending: creando } = useMutation({
    mutationFn: (values: Record<string, string>) =>
      apiClient.post('/partner', values).then(r => (r.data as { data: { id: string; nome: string } }).data),
    onSuccess: (nuovoPartner) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.partner });
      setModalNuovoEnte(false);
      formNuovoEnte.resetFields();
      form.setFieldValue('partner_id', nuovoPartner.id);
      notification.success({ message: `Ente "${nuovoPartner.nome}" creato`, duration: 3 });
    },
    onError: () => notification.error({ message: 'Errore durante la creazione dell\'ente', duration: 4 }),
  });

  const colori: Record<string, string> = { capofila: 'blue', partner: 'green', associato: 'orange' };
  const partnerGiaAggiunti = new Set((partnerProgetto as { partner_id: string }[] | undefined ?? []).map(p => p.partner_id));

  const colonne = [
    { title: 'Ente', render: (_: unknown, r: { partner?: { nome: string } }) => r.partner?.nome ?? '—' },
    { title: 'Ruolo', dataIndex: 'ruolo', width: 120,
      render: (v: string) => <Tag color={colori[v]}>{v}</Tag> },
    { title: '', width: 60,
      render: (_: unknown, r: { id: string }) => (
        <Button danger icon={<DeleteOutlined />} size="small" type="text"
          onClick={() => rimuovi(r.id)} />
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Partner del progetto</Title>
      <Form form={form} layout="inline" onFinish={aggiungi} style={{ marginBottom: 16 }}>
        <Form.Item name="partner_id" rules={[{ required: true }]} style={{ minWidth: 280 }}>
          <Select placeholder="Seleziona ente partner" showSearch
            options={partners?.filter((p: { id: string }) => !partnerGiaAggiunti.has(p.id))
              .map((p: { id: string; nome: string }) => ({ value: p.id, label: p.nome }))}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
        </Form.Item>
        <Form.Item name="ruolo" initialValue="partner">
          <Select style={{ width: 130 }} options={[
            { value: 'capofila', label: 'Capofila' },
            { value: 'partner', label: 'Partner' },
            { value: 'associato', label: 'Associato' },
          ]} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={isPending}>
            Aggiungi
          </Button>
        </Form.Item>
        <Form.Item>
          <Button onClick={() => setModalNuovoEnte(true)}>
            + Nuovo ente
          </Button>
        </Form.Item>
      </Form>

      <Modal
        open={modalNuovoEnte}
        title="Crea nuovo ente"
        onCancel={() => { setModalNuovoEnte(false); formNuovoEnte.resetFields(); }}
        onOk={() => formNuovoEnte.submit()}
        confirmLoading={creando}
        okText="Crea"
        cancelText="Annulla"
      >
        <Form form={formNuovoEnte} layout="vertical" onFinish={creaNuovoEnte} style={{ marginTop: 16 }}>
          <Form.Item name="nome" label="Nome ente" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tipo" label="Tipo" initialValue="università">
            <Select options={[
              { value: 'università', label: 'Università' },
              { value: 'ente_ricerca', label: 'Ente di ricerca' },
              { value: 'azienda', label: 'Azienda' },
              { value: 'pubblica_amministrazione', label: 'Pubblica amministrazione' },
              { value: 'altro', label: 'Altro' },
            ]} />
          </Form.Item>
          <Form.Item name="paese" label="Paese (codice ISO)" initialValue="IT">
            <Input maxLength={2} style={{ width: 80 }} />
          </Form.Item>
          <Form.Item name="referente_nome" label="Referente (opzionale)">
            <Input />
          </Form.Item>
          <Form.Item name="referente_email" label="Email referente (opzionale)">
            <Input type="email" />
          </Form.Item>
        </Form>
      </Modal>
      <Table columns={colonne as never} dataSource={(partnerProgetto ?? []) as Record<string, unknown>[]} rowKey="id" pagination={false} size="small" />
      <Divider />
      <Row justify="space-between">
        <Col><Button onClick={onIndietro}>← Indietro</Button></Col>
        <Col>
          <Space>
            <Button onClick={onCompletato}>Salta (nessun partner)</Button>
            <Button type="primary" onClick={onCompletato}>Continua →</Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
