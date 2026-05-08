import { Form, Select, Button, Table, Space, Typography, Divider, Row, Col, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { configApi } from '../../../api/config';
import { queryKeys } from '../../../utils/queryKeys';

const { Title } = Typography;

interface Props {
  progettoId: string;
  onCompletato: () => void;
  onIndietro: () => void;
}

export function Step3Partner({ progettoId, onCompletato, onIndietro }: Props) {
  const [form] = Form.useForm();
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
      </Form>
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
