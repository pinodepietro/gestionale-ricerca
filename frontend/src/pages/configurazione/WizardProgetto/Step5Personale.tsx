import { useState } from 'react';
import { Form, Input, Select, InputNumber, DatePicker, Button, Table, Space, Typography, Divider, Row, Col, Modal, App, Switch, Tag, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { personaleApi } from '../../../api/personale';
import { queryKeys } from '../../../utils/queryKeys';
import { formatOre, formatData } from '../../../utils/formatters';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Props {
  progettoId: string;
  gestionePerWp?: boolean;
  onCompletato: () => void;
  onIndietro: () => void;
}

export function Step5Personale({ progettoId, gestionePerWp = false, onCompletato, onIndietro }: Props) {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [modalAperta, setModalAperta] = useState(false);
  const [allocInModifica, setAllocInModifica] = useState<Record<string, unknown> | null>(null);
  const [showPiWarning, setShowPiWarning] = useState(false);
  const queryClient = useQueryClient();

  const { data: persone } = useQuery({
    queryKey: queryKeys.personale.list({ attivo: true }),
    queryFn: () => personaleApi.list({ attivo: true }).then(r => r.data.data),
  });

  const { data: allocazioni } = useQuery({
    queryKey: queryKeys.progetti.allocazioni(progettoId),
    queryFn: () => progettiApi.allocazioni.list(progettoId).then(r => r.data.data),
  });

  function handleErrore(error: unknown) {
    const errData = (error as { response?: { data?: { detail?: { error?: { message?: string; code?: string } } } } })
      ?.response?.data?.detail?.error;
    if (!errData) { notification.error({ message: 'Errore di rete', duration: 6 }); return; }
    switch (errData.code) {
      case 'DATE_FUORI_PROGETTO':
        notification.error({ message: 'Date non compatibili con il progetto', description: errData.message, duration: 8 }); break;
      case 'MONTE_ORE_INSUFFICIENTE':
        notification.warning({ message: 'Monte ore insufficiente', description: errData.message, duration: 8 }); break;
      case 'DATE_NON_VALIDE':
        notification.warning({ message: 'Date non valide', description: errData.message, duration: 6 }); break;
      default:
        notification.error({ message: 'Errore durante il salvataggio', description: errData.message, duration: 6 });
    }
  }

  const { mutate: salva, isPending } = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        data_inizio: dayjs(values.data_inizio as string).format('YYYY-MM-DD'),
        data_fine: dayjs(values.data_fine as string).format('YYYY-MM-DD'),
      };
      if (allocInModifica) {
        return progettiApi.allocazioni.update(progettoId, allocInModifica.id as string, payload).then(r => r.data.data);
      }
      return progettiApi.allocazioni.create(progettoId, payload).then(r => r.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.allocazioni(progettoId) });
      setModalAperta(false); setAllocInModifica(null); form.resetFields(); setShowPiWarning(false);
    },
    onError: handleErrore,
  });

  const { mutate: rimuovi } = useMutation({
    mutationFn: (allocId: string) => progettiApi.allocazioni.delete(progettoId, allocId).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.progetti.allocazioni(progettoId) }),
  });

  function apriModifica(alloc: Record<string, unknown>) {
    setAllocInModifica(alloc);
    form.setFieldsValue({
      ...alloc,
      data_inizio: alloc.data_inizio ? dayjs(alloc.data_inizio as string) : null,
      data_fine: alloc.data_fine ? dayjs(alloc.data_fine as string) : null,
    });
    setModalAperta(true);
  }

  const colonne = [
    { title: 'Persona', render: (_: unknown, r: { persona?: { nome: string; cognome: string } }) =>
        r.persona ? `${r.persona.cognome} ${r.persona.nome}` : '—' },
    { title: 'Ore assegnate', dataIndex: 'ore_assegnate', width: 130, render: formatOre },
    { title: 'PI', dataIndex: 'is_pi', width: 60,
      render: (v: boolean) => v ? <Tag color="green">PI</Tag> : null },
    { title: 'Ammin', dataIndex: 'is_ammin', width: 70,
      render: (v: boolean) => v ? <Tag color="orange">Ammin</Tag> : null },
    { title: 'Dal', dataIndex: 'data_inizio', width: 110, render: formatData },
    { title: 'Al', dataIndex: 'data_fine', width: 110, render: formatData },
    { title: '', width: 100,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" type="text" onClick={() => apriModifica(r)} />
          <Button danger icon={<DeleteOutlined />} size="small" type="text" onClick={() => rimuovi(r.id as string)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Allocazione personale</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Assegna le ore previste per ogni ricercatore. Il sistema verifica la disponibilità sul monte ore annuale.
      </Text>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)} style={{ marginBottom: 16 }}>
        Aggiungi persona
      </Button>
      <Table columns={colonne} dataSource={(allocazioni ?? []) as Record<string, unknown>[]} rowKey="id" pagination={false} size="small" />

      <Modal open={modalAperta} title={allocInModifica ? 'Modifica allocazione' : 'Nuova allocazione'}
        onCancel={() => { setModalAperta(false); setAllocInModifica(null); form.resetFields(); setShowPiWarning(false); }}
        onOk={() => form.submit()} confirmLoading={isPending} okText="Salva" cancelText="Annulla" width={520}>
        <Form form={form} layout="vertical" onFinish={salva} style={{ marginTop: 16 }}>
          <Form.Item name="persona_id" label="Persona" rules={[{ required: true }]}>
            <Select placeholder="Seleziona persona" showSearch disabled={!!allocInModifica}
              options={persone?.map((p: { id: string; nome: string; cognome: string }) => ({
                value: p.id, label: `${p.cognome} ${p.nome}` }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
          </Form.Item>
          <Form.Item name="ore_assegnate" label="Ore assegnate" rules={[{ required: true }]}>
            <InputNumber min={1} precision={2} style={{ width: '100%' }} placeholder="es. 200" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="data_inizio" label="Dal" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="data_fine" label="Al" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="is_pi" label="PI del progetto" valuePropName="checked" initialValue={false}>
            <Switch onChange={(checked) => {
              if (checked) {
                const piEsistente = (allocazioni as { is_pi: boolean; id: string }[] | undefined)
                  ?.find(a => a.is_pi && a.id !== allocInModifica?.id);
                setShowPiWarning(!!piEsistente);
              } else {
                setShowPiWarning(false);
              }
            }} />
          </Form.Item>
          <Form.Item name="is_ammin" label="Responsabile Amministrativo" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          {showPiWarning && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              message="Attenzione: esiste già un PI per questo progetto. Proseguendo il ruolo PI verrà rimosso dalla persona precedente."
            />
          )}
          <Form.Item name="note" label="Note"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Divider />
      <Row justify="space-between">
        <Col><Button onClick={onIndietro}>← Indietro</Button></Col>
        <Col>
          <Space>
            <Button onClick={onCompletato}>Salta</Button>
            <Button type="primary" onClick={onCompletato}>
              {gestionePerWp ? 'Avanti →' : 'Completa configurazione ✓'}
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
