import { useState } from 'react';
import { Button, Modal, Form, Input, Select, Switch, Space, Divider, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../utils/queryKeys';

const CATEGORIE = [
  { value: 'personale', label: 'Personale' },
  { value: 'materiali', label: 'Materiali' },
  { value: 'servizi', label: 'Servizi' },
  { value: 'missioni', label: 'Missioni' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'altro', label: 'Altro' },
];

interface Props {
  onCreata?: (id: string) => void;
}

export function CreaVoceDiCostoButton({ onCreata }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [aperta, setAperta] = useState(false);
  const [form] = Form.useForm();

  const { mutate, isPending } = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      apiClient.post<{ data: { id: string } }>('/voci-di-costo', values).then(r => r.data.data),
    onSuccess: (nuovaVoce) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.vociDiCosto });
      notification.success({ message: 'Voce di costo creata' });
      setAperta(false);
      form.resetFields();
      onCreata?.(nuovaVoce.id);
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore durante la creazione';
      notification.error({ message: msg });
    },
  });

  return (
    <>
      <Button
        size="small"
        icon={<PlusOutlined />}
        onClick={() => setAperta(true)}
        title="Crea nuova voce di costo"
      >
        Nuova voce
      </Button>

      <Modal
        title="Crea nuova voce di costo"
        open={aperta}
        onCancel={() => { setAperta(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={isPending}
        okText="Crea"
        cancelText="Annulla"
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={v => mutate(v)} style={{ marginTop: 16 }}>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="codice" label="Codice" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="es. A.1" />
            </Form.Item>
            <Form.Item name="categoria" label="Categoria" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Select options={CATEGORIE} />
            </Form.Item>
          </Space>
          <Form.Item name="descrizione" label="Descrizione" rules={[{ required: true }]}>
            <Input placeholder="es. Attrezzature specialistiche" />
          </Form.Item>
          <Divider>Ammissibilità per tipo finanziamento</Divider>
          <Space size={24}>
            <Form.Item name="ammissibile_horizon" label="Horizon Europe" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="ammissibile_pnrr" label="PNRR" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="ammissibile_por" label="POR/FESR" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
