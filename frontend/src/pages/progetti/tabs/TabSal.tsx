// frontend/src/pages/progetti/tabs/TabSal.tsx
import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, DatePicker, InputNumber, Typography, App, Popconfirm, Alert } from 'antd';
import { PlusOutlined, LockOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { salApi } from '../../../api/sal';
import { queryKeys } from '../../../utils/queryKeys';
import { RbacGuard } from '../../../components/common/RbacGuard';
import { formatData, formatEuro } from '../../../utils/formatters';
import type { Sal } from '../../../types/budget';

const { Text } = Typography;

const COLORI_STATO: Record<string, string> = {
  aperto: 'green', chiuso: 'orange', inviato: 'blue',
  contestato: 'red', rendicontato: 'purple',
};

interface Props { progettoId: string; stato?: string; }

export function TabSal({ progettoId, stato }: Props) {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [salDaModificare, setSalDaModificare] = useState<Sal | null>(null);
  const [formCrea] = Form.useForm();
  const [formModifica] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.sal.byProgetto(progettoId),
    queryFn: () => salApi.list(progettoId).then(r => r.data.data as Sal[]),
    enabled: !!progettoId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.sal.byProgetto(progettoId) });

  const creaSal = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      salApi.create({ ...values, progetto_id: progettoId }).then(r => r.data.data),
    onSuccess: () => {
      invalidate();
      notification.success({ message: 'SAL creato con successo' });
      setModalAperta(false);
      formCrea.resetFields();
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Errore durante la creazione del SAL' });
    },
  });

  const aggiornaSal = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      salApi.update(id, values).then(r => r.data.data),
    onSuccess: (_, { id }) => {
      invalidate();
      queryClient.removeQueries({ queryKey: queryKeys.sal.detail(id) });
      notification.success({ message: 'SAL aggiornato' });
      setSalDaModificare(null);
      formModifica.resetFields();
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Errore durante la modifica del SAL' });
    },
  });

  const chiudiSal = useMutation({
    mutationFn: (id: string) => salApi.chiudi(id).then(r => r.data.data),
    onSuccess: (data) => {
      invalidate();
      notification.success({ message: `SAL ${data.numero} chiuso` });
    },
  });

  const eliminaSal = useMutation({
    mutationFn: (id: string) => salApi.delete(id),
    onSuccess: () => {
      invalidate();
      notification.success({ message: 'SAL eliminato' });
    },
  });

  const formatPayload = (values: Record<string, unknown>) => ({
    ...values,
    data_inizio: values.data_inizio ? dayjs(values.data_inizio as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    data_fine: values.data_fine ? dayjs(values.data_fine as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    data_scadenza_rendiconto: values.data_scadenza_rendiconto
      ? dayjs(values.data_scadenza_rendiconto as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
  });

  const apriModifica = (sal: Sal) => {
    setSalDaModificare(sal);
    formModifica.setFieldsValue({
      data_inizio: sal.data_inizio ? dayjs(sal.data_inizio) : undefined,
      data_fine: sal.data_fine ? dayjs(sal.data_fine) : undefined,
      data_scadenza_rendiconto: sal.data_scadenza_rendiconto ? dayjs(sal.data_scadenza_rendiconto) : undefined,
      importo_tranche: sal.importo_tranche,
    });
  };

  const dateFineDopoDiInizio = ({ getFieldValue }: { getFieldValue: (f: string) => dayjs.Dayjs | undefined }) => ({
    validator(_: unknown, value: dayjs.Dayjs | undefined) {
      const inizio = getFieldValue('data_inizio');
      if (!value || !inizio || !value.isBefore(inizio, 'day')) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('La data di fine deve essere successiva alla data di inizio'));
    },
  });

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
      title: '', key: 'azioni', width: 180,
      render: (_: unknown, r: Sal) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/sal/${r.id}`)}>Apri</Button>
          <RbacGuard azione="sal:crea">
            {r.stato === 'aperto' && (
              <>
                <Button size="small" icon={<EditOutlined />}
                  onClick={() => apriModifica(r)}>
                  Modifica
                </Button>
                <Popconfirm title="Chiudi questo SAL?"
                  description="Una volta chiuso le voci selezionate saranno bloccate."
                  onConfirm={() => chiudiSal.mutate(r.id)}
                  okText="Chiudi" cancelText="Annulla">
                  <Button size="small" icon={<LockOutlined />} loading={chiudiSal.isPending}>
                    Chiudi
                  </Button>
                </Popconfirm>
                <Popconfirm title="Eliminare questo SAL?"
                  onConfirm={() => eliminaSal.mutate(r.id)}
                  okText="Elimina" cancelText="Annulla" okButtonProps={{ danger: true }}>
                  <Button size="small" danger icon={<DeleteOutlined />} type="text" />
                </Popconfirm>
              </>
            )}
          </RbacGuard>
        </Space>
      ),
    },
  ];

  if (stato === 'bozza') {
    return (
      <Alert
        type="warning"
        showIcon
        message="Progetto non ancora attivo"
        description="Attiva il progetto per poter creare SAL e gestire la rendicontazione."
        style={{ marginTop: 8 }}
      />
    );
  }

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

      {/* Modal creazione */}
      <Modal title="Nuovo SAL" open={modalAperta}
        onCancel={() => { setModalAperta(false); formCrea.resetFields(); }}
        onOk={() => formCrea.submit()} okText="Crea SAL" cancelText="Annulla"
        confirmLoading={creaSal.isPending} width={480}>
        <Form form={formCrea} layout="vertical" onFinish={(v) => creaSal.mutate(formatPayload(v))}
          style={{ marginTop: 16 }}>
          <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="data_fine" label="Data fine"
            rules={[{ required: true }, (form) => dateFineDopoDiInizio(form)]}>
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

      {/* Modal modifica */}
      <Modal title={`Modifica SAL ${salDaModificare?.numero ?? ''}`}
        open={!!salDaModificare}
        onCancel={() => { setSalDaModificare(null); formModifica.resetFields(); }}
        onOk={() => formModifica.submit()} okText="Salva modifiche" cancelText="Annulla"
        confirmLoading={aggiornaSal.isPending} width={480}>
        <Form form={formModifica} layout="vertical"
          onFinish={(v) => salDaModificare && aggiornaSal.mutate({ id: salDaModificare.id, values: formatPayload(v) })}
          style={{ marginTop: 16 }}>
          <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="data_fine" label="Data fine"
            rules={[{ required: true }, (form) => dateFineDopoDiInizio(form)]}>
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
