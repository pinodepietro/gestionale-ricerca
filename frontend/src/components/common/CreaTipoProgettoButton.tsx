import { useState } from 'react';
import { Button, Modal, Form, Input, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../utils/queryKeys';

interface Props {
  onCreato?: (nome: string) => void;
}

export function CreaTipoProgettoButton({ onCreato }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [aperta, setAperta] = useState(false);
  const [form] = Form.useForm();

  const { mutate, isPending } = useMutation({
    mutationFn: (values: { nome: string }) =>
      apiClient.post<{ data: { id: string; nome: string } }>('/tipi-progetto', values).then(r => r.data.data),
    onSuccess: (nuovo) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.tipiProgetto });
      notification.success({ message: `Tipo "${nuovo.nome}" creato` });
      setAperta(false);
      form.resetFields();
      onCreato?.(nuovo.nome);
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore durante la creazione';
      notification.error({ message: msg });
    },
  });

  return (
    <>
      <Button size="small" icon={<PlusOutlined />} onClick={() => setAperta(true)}>
        Nuovo tipo
      </Button>

      <Modal
        title="Crea nuovo tipo di progetto"
        open={aperta}
        onCancel={() => { setAperta(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={isPending}
        okText="Crea"
        cancelText="Annulla"
        width={360}
      >
        <Form form={form} layout="vertical" onFinish={v => mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="nome" label="Nome" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input placeholder="es. PON, FESR, Contratto conto terzi" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
