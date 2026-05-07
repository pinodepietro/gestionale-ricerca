// frontend/src/pages/progetti/tabs/TabSal.tsx
import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, DatePicker, InputNumber, Typography, App, Popconfirm } from 'antd';
import { PlusOutlined, LockOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { salApi } from '../../../api/sal';
import { queryKeys } from '../../../utils/queryKeys';
import { RbacGuard } from '../../../components/common/RbacGuard';
import { StatoBadge } from '../../../components/common/StatoBadge';
import { formatData, formatEuro } from '../../../utils/formatters';
import type { Sal } from '../../../types/budget';

const { Text } = Typography;

const COLORI_STATO: Record<string, string> = {
  aperto: 'green', chiuso: 'orange', inviato: 'blue',
  contestato: 'red', rendicontato: 'purple',
};

interface Props { progettoId: string; }

export function TabSal({ progettoId }: Props) {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.sal.byProgetto(progettoId),
    queryFn: () => salApi.list(progettoId).then(r => r.data.data as Sal[]),
    enabled: !!progettoId,
  });

  const creaSal = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      salApi.create({ ...values, progetto_id: progettoId }).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sal.byProgetto(progettoId) });
      notification.success({ message: 'SAL creato con successo' });
      setModalAperta(false);
      form.resetFields();
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Errore durante la creazione del SAL' });
    },
  });

  const chiudiSal = useMutation({
    mutationFn: (id: string) => salApi.chiudi(id).then(r => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sal.byProgetto(progettoId) });
      notification.success({ message: `SAL ${data.numero} chiuso` });
    },
  });

  const eliminaSal = useMutation({
    mutationFn: (id: string) => salApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sal.byProgetto(progettoId) });
      notification.success({ message: 'SAL eliminato' });
    },
  });

  const handleSubmit = (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      data_inizio: values.data_inizio ? dayjs(values.data_inizio as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      data_fine: values.data_fine ? dayjs(values.data_fine as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      data_scadenza_rendiconto: values.data_scadenza_rendiconto
        ? dayjs(values.data_scadenza_rendiconto as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    };
    creaSal.mutate(payload);
  };

  const colonne = [
    { title: 'N°', dataIndex: 'numero', width: 60 },
    { title: 'Periodo', key: 'periodo',
      render: (_: unknown, r: Sal) => `${formatData(r.data_inizio)} → ${formatData(r.data_fine)}` },
    { title: 'Scad. rendiconto', dataIndex: 'data_scadenza_rendiconto', render: formatData, width: 150 },
    { title: 'Tranche', dataIndex: 'importo_tranche',
      render: (v: number) => v ? formatEuro(v) : '—', width: 130 },
    { title: 'Stato', dataIndex: 'stato', width: 120,
      render: (stato: string) => <Tag color={COLORI_STATO[stato]}>{stato}</Tag> },
    {
      title: '', key: 'azioni', width: 160,
      render: (_: unknown, r: Sal) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/sal/${r.id}`)}>Apri</Button>
          <RbacGuard azione="sal:crea">
            {r.stato === 'aperto' && (
              <Popconfirm title="Chiudi questo SAL?"
                description="Una volta chiuso non sarà più modificabile."
                onConfirm={() => chiudiSal.mutate(r.id)}
                okText="Chiudi" cancelText="Annulla">
                <Button size="small" icon={<LockOutlined />} loading={chiudiSal.isPending}>
                  Chiudi
                </Button>
              </Popconfirm>
            )}
            {r.stato === 'aperto' && (
              <Popconfirm title="Eliminare questo SAL?"
                onConfirm={() => eliminaSal.mutate(r.id)}
                okText="Elimina" cancelText="Annulla" okButtonProps={{ danger: true }}>
                <Button size="small" danger icon={<DeleteOutlined />} type="text" />
              </Popconfirm>
            )}
          </RbacGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>SAL del progetto</Text>
        <RbacGuard azione="sal:crea">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)}>
            Nuovo SAL
          </Button>
        </RbacGuard>
      </div>

      <Table columns={colonne} dataSource={data ?? []} rowKey="id" loading={isLoading}
        pagination={false} size="small"
        locale={{ emptyText: 'Nessun SAL creato per questo progetto' }} />

      <Modal title="Nuovo SAL" open={modalAperta}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()} okText="Crea SAL" cancelText="Annulla"
        confirmLoading={creaSal.isPending} width={480}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="data_fine" label="Data fine" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="data_scadenza_rendiconto" label="Scadenza rendiconto">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="importo_tranche" label="Importo tranche (€)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
