import { useState } from 'react';
import { Table, Input, Button, Typography, Row, Col, Tag, Modal, Form, Select, Space } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerApi } from '../../api/partner';
import { RbacGuard } from '../../components/common/RbacGuard';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import type { Partner } from '../../types/progetto';

const { Title } = Typography;

const TIPI_PARTNER = [
  { value: 'università', label: 'Università' },
  { value: 'ente_pubblico', label: 'Ente pubblico' },
  { value: 'impresa', label: 'Impresa' },
  { value: 'no_profit', label: 'No profit' },
];

const COLORI_TIPO: Record<string, string> = {
  università: 'blue', ente_pubblico: 'green', impresa: 'orange', no_profit: 'purple',
};

export function PartnerPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalAperta, setModalAperta] = useState(false);
  const [partnerInModifica, setPartnerInModifica] = useState<Partner | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['partner', search],
    queryFn: () => partnerApi.list({ search }).then(r => r.data),
  });

  const { mutate: salva, isPending } = useMutation({
    mutationFn: (values: Partial<Partner>) => {
      if (partnerInModifica) {
        return partnerApi.update(partnerInModifica.id, values).then(r => r.data.data);
      }
      return partnerApi.create(values).then(r => r.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner'] });
      queryClient.invalidateQueries({ queryKey: ['config', 'partner'] });
      setModalAperta(false);
      setPartnerInModifica(null);
      form.resetFields();
    },
  });

  const { mutate: elimina, isPending: eliminando } = useMutation({
    mutationFn: (id: string) => partnerApi.delete(id).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner'] });
      setConfirmDelete(null);
    },
  });

  function apriModifica(partner: Partner) {
    setPartnerInModifica(partner);
    form.setFieldsValue(partner);
    setModalAperta(true);
  }

  function chiudiModal() {
    setModalAperta(false);
    setPartnerInModifica(null);
    form.resetFields();
  }

  const colonne = [
    { title: 'Nome', dataIndex: 'nome', ellipsis: true },
    { title: 'Tipo', dataIndex: 'tipo', width: 130,
      render: (v: string) => <Tag color={COLORI_TIPO[v] ?? 'default'}>{TIPI_PARTNER.find(t => t.value === v)?.label ?? v}</Tag> },
    { title: 'Paese', dataIndex: 'paese', width: 70 },
    { title: 'Cod. Fiscale / P.IVA', dataIndex: 'codice_fiscale', width: 160 },
    { title: 'Referente', dataIndex: 'referente_nome', width: 160 },
    { title: 'Email referente', dataIndex: 'referente_email', width: 200, ellipsis: true },
    {
      title: '', width: 90,
      render: (_: unknown, r: Partner) => (
        <RbacGuard azione="partner:gestisci">
          <Space>
            <Button icon={<EditOutlined />} size="small" type="text"
              onClick={e => { e.stopPropagation(); apriModifica(r); }} />
            <Button icon={<DeleteOutlined />} size="small" type="text" danger
              onClick={e => { e.stopPropagation(); setConfirmDelete(r.id); }} />
          </Space>
        </RbacGuard>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={2} style={{ margin: 0 }}>Partner / Enti</Title></Col>
        <Col>
          <RbacGuard azione="partner:gestisci">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)}>
              Nuovo partner
            </Button>
          </RbacGuard>
        </Col>
      </Row>

      <Input prefix={<SearchOutlined />} placeholder="Cerca per nome o codice fiscale..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: 320, marginBottom: 16 }} allowClear />

      <Table columns={colonne} dataSource={data?.data ?? []} rowKey="id" loading={isLoading}
        pagination={{ total: data?.meta?.total ?? 0, pageSize: 50, showTotal: t => `${t} partner` }} />

      <Modal open={modalAperta} title={partnerInModifica ? 'Modifica partner' : 'Nuovo partner'}
        onCancel={chiudiModal} onOk={() => form.submit()} confirmLoading={isPending}
        okText="Salva" cancelText="Annulla" width={600}>
        <Form form={form} layout="vertical" onFinish={salva} style={{ marginTop: 16 }}>
          <Form.Item name="nome" label="Nome ente" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input placeholder="es. Università degli Studi di Napoli Federico II" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]} initialValue="università">
                <Select options={TIPI_PARTNER} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paese" label="Paese" initialValue="IT">
                <Input placeholder="Codice ISO es. IT, DE, FR" maxLength={2} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="codice_fiscale" label="Codice Fiscale / P.IVA">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="referente_nome" label="Nome referente"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="referente_email" label="Email referente"
                rules={[{ type: 'email', message: 'Email non valida' }]}><Input /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <ConfirmModal open={!!confirmDelete} title="Elimina partner"
        content="Sei sicuro di voler eliminare questo partner?"
        okText="Elimina" okDanger confirmLoading={eliminando}
        onConfirm={() => confirmDelete && elimina(confirmDelete)}
        onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}
