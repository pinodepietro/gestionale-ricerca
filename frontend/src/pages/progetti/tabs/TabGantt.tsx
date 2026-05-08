// frontend/src/pages/progetti/tabs/TabGantt.tsx
import { useState } from 'react';
import { Space, Select, Table, Tag, Typography, Tabs, Button, Modal, Form,
         Input, DatePicker, App, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { GanttWrapper } from '../../../components/gantt/GanttWrapper';
import { RbacGuard } from '../../../components/common/RbacGuard';
import { useWorkPackages } from '../../../hooks/useStruttura';
import { progettiApi } from '../../../api/progetti';
import { apiClient } from '../../../api/client';
import { formatData } from '../../../utils/formatters';
import { apiErrorMessage } from '../../../utils/apiError';
import type { WorkPackage, Milestone, Deliverable } from '../../../types/struttura';
import type { ApiResponse } from '../../../types/api';

const { Text } = Typography;

const STATO_COLORI_WP: Record<string, string> = {
  pianificato: 'default', in_corso: 'blue', completato: 'green',
};
const STATO_COLORI_MS: Record<string, string> = {
  attesa: 'default', raggiunta: 'green', in_ritardo: 'red',
};
const STATO_COLORI_DEL: Record<string, string> = {
  atteso: 'default', consegnato: 'green', in_ritardo: 'red', accettato: 'purple',
};

interface Props { progettoId: string; }

export function TabGantt({ progettoId }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'Week' | 'Month'>('Month');
  const [modalWp, setModalWp] = useState(false);
  const [modalMs, setModalMs] = useState(false);
  const [modalDel, setModalDel] = useState(false);
  const [inModifica, setInModifica] = useState<Record<string, unknown> | null>(null);
  const [formWp] = Form.useForm();
  const [formMs] = Form.useForm();
  const [formDel] = Form.useForm();

  const { data: progetto } = useQuery({
    queryKey: ['progetti', progettoId],
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const { data: wps, isLoading: loadingWp } = useWorkPackages(progettoId);

  const { data: milestones } = useQuery({
    queryKey: ['progetti', progettoId, 'milestone'],
    queryFn: () => apiClient.get<ApiResponse<Milestone[]>>(`/progetti/${progettoId}/milestone`)
      .then(r => r.data.data),
    enabled: !!progettoId,
  });

  const { data: deliverable } = useQuery({
    queryKey: ['progetti', progettoId, 'deliverable'],
    queryFn: () => apiClient.get<ApiResponse<Deliverable[]>>(`/progetti/${progettoId}/deliverable`)
      .then(r => r.data.data),
    enabled: !!progettoId,
  });

  // ── WP mutations ────────────────────────────────────────────────────────────
  const salvaWp = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        progetto_id: progettoId,
        data_inizio: dayjs(values.data_inizio as dayjs.Dayjs).format('YYYY-MM-DD'),
        data_fine: dayjs(values.data_fine as dayjs.Dayjs).format('YYYY-MM-DD'),
      };
      if (inModifica?.id) return progettiApi.wp.update(inModifica.id as string, payload);
      return progettiApi.wp.create(progettoId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'wp'] });
      notification.success({ message: inModifica?.id ? 'WP aggiornato' : 'WP creato' });
      setModalWp(false); setInModifica(null); formWp.resetFields();
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante il salvataggio') }),
  });

  const eliminaWp = useMutation({
    mutationFn: (id: string) => progettiApi.wp.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'wp'] });
      notification.success({ message: 'WP eliminato' });
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante l\'eliminazione') }),
  });

  // ── Milestone mutations ──────────────────────────────────────────────────────
  const salvaMs = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        progetto_id: progettoId,
        data_prevista: dayjs(values.data_prevista as dayjs.Dayjs).format('YYYY-MM-DD'),
        data_effettiva: values.data_effettiva
          ? dayjs(values.data_effettiva as dayjs.Dayjs).format('YYYY-MM-DD') : null,
      };
      if (inModifica?.id)
        return apiClient.patch(`/progetti/${progettoId}/milestone/${inModifica.id}`, payload);
      return apiClient.post(`/progetti/${progettoId}/milestone`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'milestone'] });
      notification.success({ message: inModifica?.id ? 'Milestone aggiornata' : 'Milestone creata' });
      setModalMs(false); setInModifica(null); formMs.resetFields();
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore') }),
  });

  const eliminaMs = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/progetti/${progettoId}/milestone/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'milestone'] });
      notification.success({ message: 'Milestone eliminata' });
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante l\'eliminazione') }),
  });

  // ── Deliverable mutations ────────────────────────────────────────────────────
  const salvaDel = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        progetto_id: progettoId,
        data_scadenza: dayjs(values.data_scadenza as dayjs.Dayjs).format('YYYY-MM-DD'),
        data_consegna: values.data_consegna
          ? dayjs(values.data_consegna as dayjs.Dayjs).format('YYYY-MM-DD') : null,
      };
      if (inModifica?.id)
        return apiClient.patch(`/progetti/${progettoId}/deliverable/${inModifica.id}`, payload);
      return apiClient.post(`/progetti/${progettoId}/deliverable`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'deliverable'] });
      notification.success({ message: inModifica?.id ? 'Deliverable aggiornato' : 'Deliverable creato' });
      setModalDel(false); setInModifica(null); formDel.resetFields();
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore') }),
  });

  const eliminaDel = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/progetti/${progettoId}/deliverable/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetti', progettoId, 'deliverable'] });
      notification.success({ message: 'Deliverable eliminato' });
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante l\'eliminazione') }),
  });

  const apriModificaWp = (r: WorkPackage) => {
    setInModifica(r as unknown as Record<string, unknown>);
    formWp.setFieldsValue({
      ...r,
      data_inizio: dayjs(r.data_inizio),
      data_fine: dayjs(r.data_fine),
    });
    setModalWp(true);
  };

  const apriModificaMs = (r: Milestone) => {
    setInModifica(r as unknown as Record<string, unknown>);
    formMs.setFieldsValue({
      ...r,
      data_prevista: dayjs(r.data_prevista),
      data_effettiva: r.data_effettiva ? dayjs(r.data_effettiva) : null,
    });
    setModalMs(true);
  };

  const apriModificaDel = (r: Deliverable) => {
    setInModifica(r as unknown as Record<string, unknown>);
    formDel.setFieldsValue({
      ...r,
      data_scadenza: dayjs(r.data_scadenza),
      data_consegna: r.data_consegna ? dayjs(r.data_consegna) : null,
    });
    setModalDel(true);
  };

  // ── Colonne tabelle ──────────────────────────────────────────────────────────
  const colonneWp = [
    { title: 'Codice', dataIndex: 'codice', width: 80 },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Inizio', dataIndex: 'data_inizio', width: 105, render: formatData },
    { title: 'Fine', dataIndex: 'data_fine', width: 105, render: formatData },
    { title: 'Stato', dataIndex: 'stato', width: 110,
      render: (v: string) => <Tag color={STATO_COLORI_WP[v]}>{v.replace('_', ' ')}</Tag> },
    { title: '', width: 80, render: (_: unknown, r: WorkPackage) => (
      <RbacGuard azione="progetto:modifica">
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => apriModificaWp(r)} />
          <Popconfirm title="Eliminare?" onConfirm={() => eliminaWp.mutate(r.id)}
            okText="Sì" cancelText="No" okButtonProps={{ danger: true }}>
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      </RbacGuard>
    )},
  ];

  const colonneMs = [
    { title: 'Codice', dataIndex: 'codice', width: 80 },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Data prevista', dataIndex: 'data_prevista', width: 120, render: formatData },
    { title: 'Data effettiva', dataIndex: 'data_effettiva', width: 120, render: formatData },
    { title: 'Stato', dataIndex: 'stato', width: 110,
      render: (v: string) => <Tag color={STATO_COLORI_MS[v]}>{v.replace('_', ' ')}</Tag> },
    { title: '', width: 80, render: (_: unknown, r: Milestone) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} type="text" onClick={() => apriModificaMs(r)} />
        <Popconfirm title="Eliminare?" onConfirm={() => eliminaMs.mutate(r.id)}
          okText="Sì" cancelText="No" okButtonProps={{ danger: true }}>
          <Button size="small" icon={<DeleteOutlined />} type="text" danger />
        </Popconfirm>
      </Space>
    )},
  ];

  const colonneDel = [
    { title: 'Codice', dataIndex: 'codice', width: 80 },
    { title: 'Titolo', dataIndex: 'titolo', ellipsis: true },
    { title: 'Tipo', dataIndex: 'tipo', width: 100, render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Scadenza', dataIndex: 'data_scadenza', width: 110, render: formatData },
    { title: 'Consegna', dataIndex: 'data_consegna', width: 110, render: formatData },
    { title: 'Stato', dataIndex: 'stato', width: 110,
      render: (v: string) => <Tag color={STATO_COLORI_DEL[v]}>{v.replace('_', ' ')}</Tag> },
    { title: '', width: 80, render: (_: unknown, r: Deliverable) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} type="text" onClick={() => apriModificaDel(r)} />
        <Popconfirm title="Eliminare?" onConfirm={() => eliminaDel.mutate(r.id)}
          okText="Sì" cancelText="No" okButtonProps={{ danger: true }}>
          <Button size="small" icon={<DeleteOutlined />} type="text" danger />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      {/* Gantt */}
      {wps && wps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Space style={{ marginBottom: 12 }}>
            <Text strong>Vista Gantt</Text>
            <Select value={viewMode} onChange={setViewMode} size="small" style={{ width: 120 }}
              options={[
                { value: 'Week', label: 'Settimana' },
                { value: 'Month', label: 'Mese' },
              ]} />
          </Space>
          <GanttWrapper
            workPackages={wps ?? []}
            milestone={milestones ?? []}
            viewMode={viewMode}
            dataInizioProgetto={progetto?.data_inizio}
            dataFineProgetto={progetto?.data_fine}
          />
        </div>
      )}

      {/* Tabs WP / Milestone / Deliverable */}
      <Tabs items={[
        {
          key: 'wp', label: `Work Package (${wps?.length ?? 0})`,
          children: (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <RbacGuard azione="progetto:modifica">
                  <Button type="primary" size="small" icon={<PlusOutlined />}
                    onClick={() => { setInModifica(null); formWp.resetFields(); setModalWp(true); }}>
                    Nuovo WP
                  </Button>
                </RbacGuard>
              </div>
              <Table columns={colonneWp} dataSource={wps ?? []} rowKey="id"
                loading={loadingWp} pagination={false} size="small" />
            </div>
          ),
        },
        {
          key: 'milestone', label: `Milestone (${milestones?.length ?? 0})`,
          children: (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <RbacGuard azione="progetto:modifica">
                  <Button type="primary" size="small" icon={<PlusOutlined />}
                    onClick={() => { setInModifica(null); formMs.resetFields(); setModalMs(true); }}>
                    Nuova Milestone
                  </Button>
                </RbacGuard>
              </div>
              <Table columns={colonneMs} dataSource={milestones ?? []} rowKey="id"
                pagination={false} size="small" />
            </div>
          ),
        },
        {
          key: 'deliverable', label: `Deliverable (${deliverable?.length ?? 0})`,
          children: (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <RbacGuard azione="progetto:modifica">
                  <Button type="primary" size="small" icon={<PlusOutlined />}
                    onClick={() => { setInModifica(null); formDel.resetFields(); setModalDel(true); }}>
                    Nuovo Deliverable
                  </Button>
                </RbacGuard>
              </div>
              <Table columns={colonneDel} dataSource={deliverable ?? []} rowKey="id"
                pagination={false} size="small" />
            </div>
          ),
        },
      ]} />

      {/* Modal WP */}
      <Modal title={inModifica?.id ? 'Modifica WP' : 'Nuovo Work Package'}
        open={modalWp} onCancel={() => { setModalWp(false); formWp.resetFields(); }}
        onOk={() => formWp.submit()} confirmLoading={salvaWp.isPending} okText="Salva" width={520}>
        <Form form={formWp} layout="vertical" onFinish={v => salvaWp.mutate(v)} style={{ marginTop: 12 }}>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="codice" label="Codice" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="WP1" />
            </Form.Item>
            <Form.Item name="stato" label="Stato" rules={[{ required: true }]} style={{ flex: 2 }}
              initialValue="pianificato">
              <Select options={[
                { value: 'pianificato', label: 'Pianificato' },
                { value: 'in_corso', label: 'In corso' },
                { value: 'completato', label: 'Completato' },
              ]} />
            </Form.Item>
          </Space>
          <Form.Item name="titolo" label="Titolo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="descrizione" label="Descrizione">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="data_fine" label="Data fine" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Modal Milestone */}
      <Modal title={inModifica?.id ? 'Modifica Milestone' : 'Nuova Milestone'}
        open={modalMs} onCancel={() => { setModalMs(false); formMs.resetFields(); }}
        onOk={() => formMs.submit()} confirmLoading={salvaMs.isPending} okText="Salva" width={480}>
        <Form form={formMs} layout="vertical" onFinish={v => salvaMs.mutate(v)} style={{ marginTop: 12 }}>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="codice" label="Codice" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="MS1" />
            </Form.Item>
            <Form.Item name="stato" label="Stato" rules={[{ required: true }]} style={{ flex: 2 }}
              initialValue="attesa">
              <Select options={[
                { value: 'attesa', label: 'In attesa' },
                { value: 'raggiunta', label: 'Raggiunta' },
                { value: 'in_ritardo', label: 'In ritardo' },
              ]} />
            </Form.Item>
          </Space>
          <Form.Item name="titolo" label="Titolo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="data_prevista" label="Data prevista" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="data_effettiva" label="Data effettiva" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Modal Deliverable */}
      <Modal title={inModifica?.id ? 'Modifica Deliverable' : 'Nuovo Deliverable'}
        open={modalDel} onCancel={() => { setModalDel(false); formDel.resetFields(); }}
        onOk={() => formDel.submit()} confirmLoading={salvaDel.isPending} okText="Salva" width={520}>
        <Form form={formDel} layout="vertical" onFinish={v => salvaDel.mutate(v)} style={{ marginTop: 12 }}>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="codice" label="Codice" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="D1.1" />
            </Form.Item>
            <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]} style={{ flex: 2 }}
              initialValue="report">
              <Select options={[
                { value: 'report', label: 'Report' },
                { value: 'software', label: 'Software' },
                { value: 'dataset', label: 'Dataset' },
                { value: 'prototipo', label: 'Prototipo' },
                { value: 'altro', label: 'Altro' },
              ]} />
            </Form.Item>
            <Form.Item name="stato" label="Stato" rules={[{ required: true }]} style={{ flex: 2 }}
              initialValue="atteso">
              <Select options={[
                { value: 'atteso', label: 'Atteso' },
                { value: 'consegnato', label: 'Consegnato' },
                { value: 'in_ritardo', label: 'In ritardo' },
                { value: 'accettato', label: 'Accettato' },
              ]} />
            </Form.Item>
          </Space>
          <Form.Item name="titolo" label="Titolo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="data_scadenza" label="Scadenza contrattuale" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="data_consegna" label="Data consegna effettiva" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
