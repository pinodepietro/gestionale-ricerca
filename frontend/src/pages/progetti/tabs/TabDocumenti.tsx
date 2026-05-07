// frontend/src/pages/progetti/tabs/TabDocumenti.tsx
import { useState } from 'react';
import { Table, Button, Space, Upload, Modal, Form, Input, Select, Typography,
         App, Popconfirm, Tag } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, PlusOutlined,
         FileOutlined, FilePdfOutlined, FileExcelOutlined, FileWordOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { RbacGuard } from '../../../components/common/RbacGuard';
import { queryKeys } from '../../../utils/queryKeys';

const { Text } = Typography;

const TIPI_DOCUMENTO = [
  { value: 'proposta', label: 'Proposta' },
  { value: 'contratto', label: 'Contratto' },
  { value: 'emendamento', label: 'Emendamento' },
  { value: 'relazione', label: 'Relazione' },
  { value: 'timesheet', label: 'Timesheet' },
  { value: 'rendiconto', label: 'Rendiconto' },
  { value: 'altro', label: 'Altro' },
];

const COLORI_TIPO: Record<string, string> = {
  proposta: 'blue', contratto: 'green', emendamento: 'orange',
  relazione: 'purple', timesheet: 'cyan', rendiconto: 'gold', altro: 'default',
};

function icona(nome: string) {
  const ext = nome.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
  if (['xlsx', 'xls'].includes(ext ?? '')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
  if (['docx', 'doc'].includes(ext ?? '')) return <FileWordOutlined style={{ color: '#1677ff' }} />;
  return <FileOutlined />;
}

interface Documento {
  id: string;
  nome_file: string;
  tipo_documento: string;
  versione?: string;
  descrizione?: string;
  uploaded_at?: string;
}

interface Props { progettoId: string; }

export function TabDocumenti({ progettoId }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [fileSelezionato, setFileSelezionato] = useState<File | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.progetti.documenti(progettoId),
    queryFn: () => apiClient.get<{ data: Documento[] }>(`/progetti/${progettoId}/documenti`)
      .then(r => r.data.data),
    enabled: !!progettoId,
  });

  const upload = useMutation({
    mutationFn: (values: { tipo_documento: string; versione?: string; descrizione?: string }) => {
      if (!fileSelezionato) throw new Error('Nessun file selezionato');
      const formData = new FormData();
      formData.append('file', fileSelezionato);
      formData.append('tipo_documento', values.tipo_documento);
      if (values.versione) formData.append('versione', values.versione);
      if (values.descrizione) formData.append('descrizione', values.descrizione);
      return apiClient.post(`/progetti/${progettoId}/documenti`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.documenti(progettoId) });
      notification.success({ message: 'Documento caricato' });
      setModalAperta(false);
      setFileSelezionato(null);
      form.resetFields();
    },
    onError: () => notification.error({ message: 'Errore durante il caricamento' }),
  });

  const elimina = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/documenti/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.documenti(progettoId) });
      notification.success({ message: 'Documento eliminato' });
    },
  });

  const scarica = async (doc: Documento) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `http://localhost:8000/api/v1/progetti/documenti/${doc.id}/download`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) { notification.error({ message: 'Errore download' }); return; }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = doc.nome_file;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const colonne = [
    {
      title: 'File', key: 'file', ellipsis: true,
      render: (_: unknown, r: Documento) => (
        <Space>
          {icona(r.nome_file)}
          <Text>{r.nome_file}</Text>
        </Space>
      ),
    },
    {
      title: 'Tipo', dataIndex: 'tipo_documento', width: 120,
      render: (v: string) => <Tag color={COLORI_TIPO[v] ?? 'default'}>{v}</Tag>,
    },
    { title: 'Versione', dataIndex: 'versione', width: 90,
      render: (v: string) => v || '—' },
    { title: 'Descrizione', dataIndex: 'descrizione', ellipsis: true,
      render: (v: string) => v || '—' },
    {
      title: 'Caricato', dataIndex: 'uploaded_at', width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }) : '—',
    },
    {
      title: '', key: 'azioni', width: 90,
      render: (_: unknown, r: Documento) => (
        <Space>
          <Button size="small" icon={<DownloadOutlined />} type="text"
            onClick={() => scarica(r)} />
          <RbacGuard azione="documento:carica">
            <Popconfirm title="Eliminare questo documento?"
              onConfirm={() => elimina.mutate(r.id)}
              okText="Elimina" cancelText="No" okButtonProps={{ danger: true }}>
              <Button size="small" icon={<DeleteOutlined />} type="text" danger />
            </Popconfirm>
          </RbacGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>Documenti del progetto</Text>
        <RbacGuard azione="documento:carica">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)}>
            Carica documento
          </Button>
        </RbacGuard>
      </div>

      <Table
        columns={colonne}
        dataSource={data ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Nessun documento caricato' }}
      />

      <Modal
        title="Carica documento"
        open={modalAperta}
        onCancel={() => { setModalAperta(false); setFileSelezionato(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Carica"
        cancelText="Annulla"
        confirmLoading={upload.isPending}
        okButtonProps={{ disabled: !fileSelezionato }}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={v => upload.mutate(v)}
          style={{ marginTop: 16 }}
          initialValues={{ tipo_documento: 'altro' }}>
          <Form.Item label="File" required>
            <Upload
              beforeUpload={(file) => { setFileSelezionato(file); return false; }}
              onRemove={() => setFileSelezionato(null)}
              maxCount={1}
              fileList={fileSelezionato ? [{
                uid: '1', name: fileSelezionato.name, status: 'done',
              }] : []}
            >
              <Button icon={<UploadOutlined />}>
                {fileSelezionato ? fileSelezionato.name : 'Seleziona file'}
              </Button>
            </Upload>
          </Form.Item>
          <Form.Item name="tipo_documento" label="Tipo documento" rules={[{ required: true }]}>
            <Select options={TIPI_DOCUMENTO} />
          </Form.Item>
          <Form.Item name="versione" label="Versione">
            <Input placeholder="es. v1.0, v2.1" />
          </Form.Item>
          <Form.Item name="descrizione" label="Descrizione">
            <Input.TextArea rows={2} placeholder="Descrizione del documento" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
