import { useState } from 'react';
import { Form, Input, DatePicker, Button, Table, Space, Typography, Divider, Row, Col, Modal, App, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { formatData } from '../../../utils/formatters';
import dayjs from 'dayjs';

interface WorkPackage {
  id: string;
  codice: string;
  titolo: string;
  descrizione?: string;
  data_inizio: string;
  data_fine: string;
  stato?: string;
}

const { Title } = Typography;

interface Props {
  progettoId: string;
  onCompletato: () => void;
  onIndietro: () => void;
}

export function Step4WorkPackage({ progettoId, onCompletato, onIndietro }: Props) {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [modalAperta, setModalAperta] = useState(false);
  const [wpInModifica, setWpInModifica] = useState<WorkPackage | null>(null);
  const queryClient = useQueryClient();

  const { data: progetto } = useQuery({
    queryKey: ['progetto', progettoId],
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
  });

  const { data: wps } = useQuery({
    queryKey: ['wp', progettoId],
    queryFn: () => progettiApi.wp.list(progettoId).then(r => r.data.data as WorkPackage[]),
  });

  const { mutate: salvaWp, isPending: salvando } = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        data_inizio: dayjs(values.data_inizio as string).format('YYYY-MM-DD'),
        data_fine: dayjs(values.data_fine as string).format('YYYY-MM-DD'),
      };
      if (wpInModifica) {
        return progettiApi.wp.update(wpInModifica.id, payload).then(r => r.data.data);
      }
      return progettiApi.wp.create(progettoId, payload).then(r => r.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wp', progettoId] });
      setModalAperta(false);
      setWpInModifica(null);
      form.resetFields();
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { detail?: { error?: { message?: string; code?: string } } } } };
      const errData = axiosError?.response?.data?.detail?.error;
      if (!errData) {
        notification.error({ message: 'Errore di rete', description: 'Impossibile contattare il server', duration: 6 });
        return;
      }
      switch (errData.code) {
        case 'DATE_FUORI_PROGETTO':
          notification.error({ message: 'Date non compatibili con il progetto', description: errData.message, duration: 8 });
          break;
        case 'DATE_NON_VALIDE':
          notification.warning({ message: 'Date non valide', description: errData.message, duration: 6 });
          break;
        default:
          notification.error({ message: 'Errore durante il salvataggio', description: errData.message ?? 'Errore sconosciuto', duration: 6 });
      }
    },
  });

  const { mutate: eliminaWp } = useMutation({
    mutationFn: (wpId: string) => progettiApi.wp.delete(wpId).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wp', progettoId] }),
  });

  function apriModifica(wp: WorkPackage) {
    setWpInModifica(wp);
    form.setFieldsValue({
      ...wp,
      data_inizio: wp.data_inizio ? dayjs(wp.data_inizio) : null,
      data_fine: wp.data_fine ? dayjs(wp.data_fine) : null,
    });
    setModalAperta(true);
  }

  function chiudiModal() {
    setModalAperta(false);
    setWpInModifica(null);
    form.resetFields();
  }

  const colonne = [
    { title: 'Codice', dataIndex: 'codice', width: 80 },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Inizio', dataIndex: 'data_inizio', width: 110, render: formatData },
    { title: 'Fine', dataIndex: 'data_fine', width: 110, render: formatData },
    {
      title: '', width: 100,
      render: (_: unknown, r: WorkPackage) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" type="text" onClick={() => apriModifica(r)} />
          <Button danger icon={<DeleteOutlined />} size="small" type="text"
            onClick={() => eliminaWp(r.id)} />
        </Space>
      ),
    },
  ];

  const periodoProgetto = progetto
    ? `${formatData(progetto.data_inizio)} → ${formatData(progetto.data_fine)}`
    : null;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Struttura Work Package</Title>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)} style={{ marginBottom: 16 }}>
        Aggiungi WP
      </Button>
      <Table columns={colonne} dataSource={wps ?? []} rowKey="id" pagination={false} size="small"
        locale={{ emptyText: 'Nessun Work Package aggiunto' }} />

      <Modal open={modalAperta} title={wpInModifica ? 'Modifica Work Package' : 'Nuovo Work Package'}
        onCancel={chiudiModal} onOk={() => form.submit()} confirmLoading={salvando}
        okText="Salva" cancelText="Annulla">
        <Form form={form} layout="vertical" onFinish={salvaWp} style={{ marginTop: 16 }}>
          {periodoProgetto && (
            <Alert
              type="info"
              message={`Periodo progetto: ${periodoProgetto}`}
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="codice" label="Codice" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <Input placeholder="es. WP1" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="titolo" label="Titolo" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descrizione" label="Descrizione">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="data_fine" label="Data fine" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Divider />
      <Row justify="space-between">
        <Col><Button onClick={onIndietro}>← Indietro</Button></Col>
        <Col>
          <Space>
            <Button onClick={onCompletato}>Salta</Button>
            <Button type="primary" onClick={onCompletato}>Continua →</Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
