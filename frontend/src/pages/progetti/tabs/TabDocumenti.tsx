// frontend/src/pages/progetti/tabs/TabDocumenti.tsx
import { useState } from 'react';
import { Table, Button, Space, Upload, Modal, Form, Input, Select, Typography,
         App, Popconfirm, Tag } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, PlusOutlined, EditOutlined,
         FileOutlined, FilePdfOutlined, FileExcelOutlined, FileWordOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { env } from '../../../config/env';
import { queryKeys } from '../../../utils/queryKeys';
import { useAuthStore } from '../../../store/useAuthStore';
import { canDo } from '../../../utils/rbac';
import { progettiApi } from '../../../api/progetti';

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

interface Props { progettoId: string; piId: string | null; }

export function TabDocumenti({ progettoId, piId }: Props) {
  const { notification } = App.useApp();
  const user = useAuthStore(s => s.user);
  const puoCaricareDocumenti = user && (
    canDo(user.ruolo, 'documento:carica') &&
    (user.ruolo !== 'ricercatore' || user.id === piId)
  );
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [fileSelezionato, setFileSelezionato] = useState<File | null>(null);
  const [form] = Form.useForm();
  const [modalModificaAperta, setModalModificaAperta] = useState(false);
  const [documentoInModifica, setDocumentoInModifica] = useState<Documento | null>(null);
  const [formModifica] = Form.useForm();

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

  const aggiorna = useMutation({
    mutationFn: (values: { descrizione?: string; tipo_documento?: string }) =>
      progettiApi.documenti.update(documentoInModifica!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.documenti(progettoId) });
      notification.success({ message: 'Documento aggiornato' });
      setModalModificaAperta(false);
      setDocumentoInModifica(null);
      formModifica.resetFields();
    },
    onError: () => notification.error({ message: 'Errore durante l\'aggiornamento' }),
  });

  const scarica = async (doc: Documento) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `${env.apiUrl}/api/v1/progetti/documenti/${doc.id}/download`,
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
      title: '', key: 'azioni', width: 120,
      render: (_: unknown, r: Documento) => (
        <Space>
          <Button size="small" icon={<DownloadOutlined />} type="text"
            onClick={() => scarica(r)} />
          {puoCaricareDocumenti && (
            <>
              <Button size="small" icon={<EditOutlined />} type="text"
                onClick={() => {
                  setDocumentoInModifica(r);
                  formModifica.setFieldsValue({
                    descrizione: r.descrizione || '',
                    tipo_documento: r.tipo_documento,
                  });
                  setModalModificaAperta(true);
                }} />
              <Popconfirm title="Eliminare questo documento?"
                onConfirm={() => elimina.mutate(r.id)}
                okText="Elimina" cancelText="No" okButtonProps={{ danger: true }}>
                <Button size="small" icon={<DeleteOutlined />} type="text" danger />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>Documenti del progetto</Text>
        {puoCaricareDocumenti && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)}>
            Carica documento
          </Button>
        )}
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

      <Modal
        title={`Modifica documento: ${documentoInModifica?.nome_file || ''}`}
        open={modalModificaAperta}
        onCancel={() => { setModalModificaAperta(false); setDocumentoInModifica(null); formModifica.resetFields(); }}
        onOk={() => formModifica.submit()}
        okText="Salva"
        cancelText="Annulla"
        confirmLoading={aggiorna.isPending}
        width={480}
      >
        <Form form={formModifica} layout="vertical" onFinish={v => aggiorna.mutate(v)}
          style={{ marginTop: 16 }}>
          <Form.Item name="tipo_documento" label="Tipo documento" rules={[{ required: true }]}>
            <Select options={TIPI_DOCUMENTO} />
          </Form.Item>
          <Form.Item name="descrizione" label="Descrizione">
            <Input.TextArea rows={3} placeholder="Descrizione del documento" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
