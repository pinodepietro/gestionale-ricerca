import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography, Button, Space, Tag, Descriptions, Card, Steps, Modal,
  Input, InputNumber, DatePicker, Form, Row, Col, Alert, Table, message, Popconfirm, Spin, Upload,
} from 'antd';
import {
  ArrowLeftOutlined, CheckOutlined, CloseOutlined, SendOutlined,
  RedoOutlined, FilePdfOutlined, WarningOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined, PaperClipOutlined, EyeOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { rimborsiSpesaApi, type RimborsoSpesa, type RimborsoSpesaRiga } from '../../api/rimborsiSpesa';
import { useAuthStore } from '../../store/useAuthStore';
import { formatData, formatEuro } from '../../utils/formatters';
import { apiErrorMessage } from '../../utils/apiError';
import { env } from '../../config/env';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATI_STEPS_BASE = [
  { key: 'bozza',          label: 'Bozza' },
  { key: 'attesa_ammin',   label: 'Resp. Ammin.' },
  { key: 'attesa_rs',      label: 'Resp. Scientifico' },
  { key: 'attesa_dir_dip', label: 'Dir. Dipartimento' },
  { key: 'attesa_dg',      label: 'Dir. Generale' },
  { key: 'approvata',      label: 'Approvata' },
];

const STATI_COLOR: Record<string, string> = {
  bozza: 'default', attesa_ammin: 'orange', attesa_rs: 'blue',
  attesa_dir_dip: 'purple', attesa_dg: 'geekblue', approvata: 'success', rigettata: 'error',
};

interface RigaFormValues {
  descrizione: string;
  data: dayjs.Dayjs;
  importo: number;
}

export function RimborsoSpesaDettaglioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [form] = Form.useForm<RigaFormValues>();

  const [modalRigetto, setModalRigetto] = useState(false);
  const [motivazione, setMotivazione] = useState('');
  const [modalRiga, setModalRiga] = useState(false);
  const [rigaInModifica, setRigaInModifica] = useState<RimborsoSpesaRiga | null>(null);

  const isSuperAdmin = user?.ruolo === 'superadmin';

  const { data: rrs, isLoading } = useQuery({
    queryKey: ['rimborso-spesa', id],
    queryFn: () => rimborsiSpesaApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rimborso-spesa', id] });
    queryClient.invalidateQueries({ queryKey: ['rimborsi-spesa'] });
  };

  const invia = useMutation({
    mutationFn: () => rimborsiSpesaApi.invia(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Richiesta inviata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'invio')),
  });

  const approvaAmmin = useMutation({
    mutationFn: () => rimborsiSpesaApi.approvaAmmin(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Approvato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'approvazione')),
  });

  const approvaRs = useMutation({
    mutationFn: () => rimborsiSpesaApi.approvaRs(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Approvato — passato al Direttore di Dipartimento'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const approvaDirDip = useMutation({
    mutationFn: () => rimborsiSpesaApi.approvaDirDip(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Approvato — passato al Direttore Generale'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const approvaDg = useMutation({
    mutationFn: () => rimborsiSpesaApi.approvaDg(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Richiesta approvata definitivamente e PDF generato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const rigetta = useMutation({
    mutationFn: () => rimborsiSpesaApi.rigetta(id!, motivazione).then(r => r.data),
    onSuccess: () => { invalidate(); setModalRigetto(false); setMotivazione(''); message.success('Richiesta rigettata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel rigetto')),
  });

  const riapri = useMutation({
    mutationFn: () => rimborsiSpesaApi.riapri(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Richiesta riaperta — puoi modificarla e reinviarla'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const salvaRiga = useMutation({
    mutationFn: (values: RigaFormValues) => {
      const payload = { descrizione: values.descrizione, data: values.data.format('YYYY-MM-DD'), importo: values.importo };
      return rigaInModifica
        ? rimborsiSpesaApi.aggiornaRiga(rigaInModifica.id, payload).then(r => r.data)
        : rimborsiSpesaApi.creaRiga(id!, payload).then(r => r.data);
    },
    onSuccess: () => { invalidate(); chiudiModalRiga(); message.success('Riga salvata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel salvataggio della riga')),
  });

  const eliminaRiga = useMutation({
    mutationFn: (rigaId: string) => rimborsiSpesaApi.eliminaRiga(rigaId).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Riga eliminata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'eliminazione')),
  });

  const uploadDocumento = useMutation({
    mutationFn: ({ rigaId, file }: { rigaId: string; file: File }) => rimborsiSpesaApi.uploadDocumentoRiga(rigaId, file),
    onSuccess: () => { invalidate(); message.success('Documento allegato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel caricamento del documento')),
  });

  const scaricaPdf = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${env.apiUrl}/api/v1/rimborsi-spesa/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      message.error('Errore nello scaricamento del PDF');
      return;
    }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `RimborsoSpesa_${id}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const scaricaDocumentoRiga = async (rigaId: string, nomeFile: string) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${env.apiUrl}/api/v1/rimborsi-spesa/righe/${rigaId}/documento`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      message.error('Errore nello scaricamento del documento');
      return;
    }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nomeFile;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const visualizzaDocumentoRiga = async (rigaId: string) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${env.apiUrl}/api/v1/rimborsi-spesa/righe/${rigaId}/documento`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      message.error('Errore nell\'apertura del documento');
      return;
    }
    const blob = await response.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const apriModalRiga = (riga: RimborsoSpesaRiga | null) => {
    setRigaInModifica(riga);
    if (riga) {
      form.setFieldsValue({ descrizione: riga.descrizione, data: dayjs(riga.data), importo: riga.importo });
    } else {
      form.resetFields();
    }
    setModalRiga(true);
  };

  const chiudiModalRiga = () => {
    setModalRiga(false);
    setRigaInModifica(null);
    form.resetFields();
  };

  if (isLoading || !rrs) return <Spin style={{ display: 'block', marginTop: 60, textAlign: 'center' }} />;

  const r = rrs as RimborsoSpesa;
  const isOwner = r.richiedente_id === user?.id;
  const isDG = user?.ruolo === 'direttore_generale';
  const isAmministrativo = r.amministrativo_id === user?.id;
  const isPI = r.pi_id === user?.id;
  const isDirDip = r.direttore_dipartimento_id === user?.id;
  const isProgetto = r.autorizzazione.tipo === 'progetto';

  const puoApprovareStep =
    (r.stato === 'attesa_ammin' && (isAmministrativo || isSuperAdmin))
    || (r.stato === 'attesa_rs' && (isPI || isSuperAdmin))
    || (r.stato === 'attesa_dir_dip' && (isDirDip || isSuperAdmin))
    || (r.stato === 'attesa_dg' && isDG);

  const puoModificare = r.stato === 'bozza' && (isOwner || isAmministrativo || isSuperAdmin);

  // Step della barra di avanzamento — i fondi individuali saltano il Responsabile Scientifico
  const statiSteps = isProgetto ? STATI_STEPS_BASE : STATI_STEPS_BASE.filter(s => s.key !== 'attesa_rs');
  const stepIdx = statiSteps.findIndex(s => s.key === r.stato);
  const stepsItems = statiSteps.map((s, idx) => ({
    title: s.label,
    status: r.stato === 'rigettata'
          ? (idx < stepIdx ? 'finish' as const : idx === stepIdx ? 'error' as const : 'wait' as const)
          : idx < stepIdx ? 'finish' as const
          : idx === stepIdx ? 'process' as const
          : 'wait' as const,
  }));

  const colonneRighe = [
    { title: 'Descrizione', dataIndex: 'descrizione' },
    { title: 'Data', dataIndex: 'data', width: 110, render: formatData },
    { title: 'Importo', dataIndex: 'importo', width: 120, align: 'right' as const, render: formatEuro },
    {
      title: 'Documento', width: 190, align: 'center' as const,
      render: (_: unknown, riga: RimborsoSpesaRiga) => (
        <Space direction="vertical" size={4} align="center" style={{ width: '100%' }}>
          {riga.ha_documento && (
            <Space size={2}>
              <Text ellipsis={{ tooltip: riga.documento_nome }} style={{ maxWidth: 100, fontSize: 12 }}>
                {riga.documento_nome}
              </Text>
              <Button size="small" type="text" icon={<EyeOutlined />} title="Visualizza"
                onClick={() => visualizzaDocumentoRiga(riga.id)} />
              <Button size="small" type="text" icon={<DownloadOutlined />} title="Scarica"
                onClick={() => scaricaDocumentoRiga(riga.id, riga.documento_nome || 'documento')} />
            </Space>
          )}
          {puoModificare ? (
            <Upload
              maxCount={1} showUploadList={false}
              beforeUpload={(file) => { uploadDocumento.mutate({ rigaId: riga.id, file }); return false; }}
            >
              <Button size="small" type={riga.ha_documento ? 'default' : 'dashed'} icon={<PaperClipOutlined />}>
                {riga.ha_documento ? 'Sostituisci' : 'Allega'}
              </Button>
            </Upload>
          ) : (!riga.ha_documento && <Text type="secondary">—</Text>)}
        </Space>
      ),
    },
    ...(puoModificare ? [{
      title: '', width: 90, align: 'center' as const,
      render: (_: unknown, riga: RimborsoSpesaRiga) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => apriModalRiga(riga)} />
          <Popconfirm title="Eliminare questa riga?" onConfirm={() => eliminaRiga.mutate(riga.id)} okText="Elimina" cancelText="Annulla">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rimborsi-spesa')}>Indietro</Button>
            <div>
              <Title level={3} style={{ margin: 0 }}>Rimborso — {r.autorizzazione.oggetto}</Title>
              <Space style={{ marginTop: 4 }}>
                <Tag color={STATI_COLOR[r.stato] ?? 'default'}>{r.stato.replace(/_/g, ' ').toUpperCase()}</Tag>
                <Text type="secondary">{r.richiedente_nome}</Text>
                <Text type="secondary">|</Text>
                <Text type="secondary">{formatData(r.created_at)}</Text>
              </Space>
            </div>
          </Space>
        </Col>
        <Col>
          <Space>
            {r.stato === 'bozza' && isOwner && (
              <Button type="primary" icon={<SendOutlined />} loading={invia.isPending} onClick={() => invia.mutate()}>
                Invia per approvazione
              </Button>
            )}
            {r.stato === 'rigettata' && isOwner && (
              <Button icon={<RedoOutlined />} loading={riapri.isPending} onClick={() => riapri.mutate()}>
                Riapri e correggi
              </Button>
            )}
            {r.stato === 'attesa_ammin' && puoApprovareStep && (
              <Button type="primary" icon={<CheckOutlined />} loading={approvaAmmin.isPending} onClick={() => approvaAmmin.mutate()}>
                Approva
              </Button>
            )}
            {r.stato === 'attesa_rs' && puoApprovareStep && (
              <Button type="primary" icon={<CheckOutlined />} loading={approvaRs.isPending} onClick={() => approvaRs.mutate()}>
                Approva
              </Button>
            )}
            {r.stato === 'attesa_dir_dip' && puoApprovareStep && (
              <Button type="primary" icon={<CheckOutlined />} loading={approvaDirDip.isPending} onClick={() => approvaDirDip.mutate()}>
                Approva
              </Button>
            )}
            {r.stato === 'attesa_dg' && puoApprovareStep && (
              <Popconfirm
                title="Approvare definitivamente?"
                description="La spesa verrà registrata a consuntivo e generato il PDF."
                onConfirm={() => approvaDg.mutate()}
                okText="Approva" cancelText="Annulla"
              >
                <Button type="primary" icon={<CheckOutlined />} loading={approvaDg.isPending}>
                  Approva definitivamente
                </Button>
              </Popconfirm>
            )}
            {['attesa_ammin','attesa_rs','attesa_dir_dip','attesa_dg'].includes(r.stato) && puoApprovareStep && (
              <Button danger icon={<CloseOutlined />} onClick={() => setModalRigetto(true)}>
                Rigetta
              </Button>
            )}
            {r.stato === 'approvata' && r.ha_pdf && (
              <Button icon={<FilePdfOutlined />} onClick={scaricaPdf}>
                Scarica PDF
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Barra di avanzamento */}
      {r.stato !== 'rigettata' ? (
        <Card style={{ marginBottom: 16 }}>
          <Steps items={stepsItems} size="small" />
        </Card>
      ) : (
        <Alert
          type="error" showIcon style={{ marginBottom: 16 }}
          message="Richiesta rigettata"
          description={r.motivazione_rigetto ? `Motivazione: ${r.motivazione_rigetto}` : undefined}
        />
      )}

      {/* Warning capienza */}
      {r.warning_capienza && ['attesa_ammin','attesa_rs','attesa_dir_dip','attesa_dg'].includes(r.stato) && (
        <Alert
          type="warning" showIcon icon={<WarningOutlined />} style={{ marginBottom: 16 }}
          message="Capienza di budget potenzialmente insufficiente"
          description={`Il totale delle spese rendicontate (${formatEuro(r.totale_righe)}) supera l'importo originariamente impegnato di ${formatEuro(r.delta_importo)}. Verificare la disponibilità residua sulla voce di budget prima di approvare.`}
        />
      )}

      {/* Riferimento autorizzazione */}
      <Card title="Autorizzazione di spesa di riferimento" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Oggetto" span={2}>{r.autorizzazione.oggetto}</Descriptions.Item>
          <Descriptions.Item label={isProgetto ? 'Progetto' : 'Tipo'}>
            {r.autorizzazione.progetto_titolo ?? 'Fondi individuali'}
          </Descriptions.Item>
          <Descriptions.Item label="Importo autorizzato"><Text strong>{formatEuro(r.autorizzazione.importo)}</Text></Descriptions.Item>
          <Descriptions.Item label="Dipartimento" span={2}>{r.autorizzazione.dipartimento_nome ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Righe di spesa */}
      <Card
        title="Spese da rimborsare"
        style={{ marginBottom: 16 }}
        extra={puoModificare && (
          <Button icon={<PlusOutlined />} size="small" onClick={() => apriModalRiga(null)}>Aggiungi riga</Button>
        )}
      >
        <Table
          columns={colonneRighe}
          dataSource={r.righe}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'Nessuna spesa inserita' }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={puoModificare ? 3 : 2}>
                <Text strong>Totale</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong>{formatEuro(r.totale_righe)}</Text>
              </Table.Summary.Cell>
              {puoModificare && <Table.Summary.Cell index={2} />}
            </Table.Summary.Row>
          )}
        />
        {r.note && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary"><b>Note:</b> {r.note}</Text>
          </div>
        )}
      </Card>

      {/* Modal rigetto */}
      <Modal
        open={modalRigetto}
        title="Rigetta richiesta"
        onCancel={() => { setModalRigetto(false); setMotivazione(''); }}
        onOk={() => rigetta.mutate()}
        okText="Rigetta"
        cancelText="Annulla"
        confirmLoading={rigetta.isPending}
        okButtonProps={{ disabled: !motivazione.trim(), danger: true }}
      >
        <TextArea
          rows={4}
          placeholder="Inserire la motivazione del rigetto (obbligatoria)..."
          value={motivazione}
          onChange={e => setMotivazione(e.target.value)}
          style={{ marginTop: 16 }}
        />
      </Modal>

      {/* Modal riga di spesa */}
      <Modal
        open={modalRiga}
        title={rigaInModifica ? 'Modifica riga di spesa' : 'Nuova riga di spesa'}
        onCancel={chiudiModalRiga}
        onOk={() => form.validateFields().then(values => salvaRiga.mutate(values))}
        okText="Salva"
        cancelText="Annulla"
        confirmLoading={salvaRiga.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="descrizione" label="Descrizione" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input placeholder="Es. Quota di iscrizione conferenza..." />
          </Form.Item>
          <Form.Item name="data" label="Data della spesa" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="importo" label="Importo (€)" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
