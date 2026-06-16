import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography, Button, Space, Tag, Card, Steps, Modal,
  Input, InputNumber, DatePicker, Form, Row, Col, Alert, Table, message,
  Popconfirm, Spin, Upload,
} from 'antd';
import {
  ArrowLeftOutlined, CheckOutlined, CloseOutlined, SendOutlined,
  RedoOutlined, FilePdfOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, PaperClipOutlined, EyeOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { rimborsiMissioneApi, type RimborsoMissione, type RigaRimborsoMissione, type AllegatoMissione } from '../../api/missioni';
import { useAuthStore } from '../../store/useAuthStore';
import { formatData, formatEuro } from '../../utils/formatters';
import { apiErrorMessage } from '../../utils/apiError';
import { env } from '../../config/env';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATI_CONFIG: Record<string, { label: string; color: string }> = {
  bozza:          { label: 'Bozza',                    color: 'default' },
  attesa_ammin:   { label: 'Attesa Ammin.',             color: 'orange' },
  attesa_pi:      { label: 'Attesa Resp. Scientifico',  color: 'blue' },
  attesa_dir_dip: { label: 'Attesa Dir. Dipartimento',  color: 'purple' },
  attesa_dg:      { label: 'Attesa Dir. Generale',      color: 'geekblue' },
  approvata:      { label: 'Approvata',                 color: 'success' },
  rigettata:      { label: 'Rigettata',                 color: 'error' },
};

const STATI_FLOW = ['bozza', 'attesa_ammin', 'attesa_pi', 'attesa_dir_dip', 'attesa_dg', 'approvata'];

const RUOLO_LABEL: Record<string, string> = {
  ammin: 'Resp. Ammin.', pi: 'Resp. Scientifico', dir_dip: 'Dir. Dipartimento', dg: 'Dir. Generale',
};

interface RigaForm { data_inizio: dayjs.Dayjs; data_fine: dayjs.Dayjs; attivita: string; importo?: number }

async function scaricaFile(url: string, nome: string) {
  const token = localStorage.getItem('access_token');
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) { message.error('Errore nel download'); return; }
  const blob = await resp.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome; a.click();
}

async function apriFile(url: string) {
  const token = localStorage.getItem('access_token');
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) { message.error('Errore nell\'apertura'); return; }
  const blob = await resp.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export function RimborsoMissioneDettaglioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [form] = Form.useForm<RigaForm>();

  const [modalApprova, setModalApprova] = useState(false);
  const [luogo, setLuogo] = useState('');
  const [noteAppr, setNoteAppr] = useState('');
  const [modalRigetto, setModalRigetto] = useState(false);
  const [motivazione, setMotivazione] = useState('');
  const [modalRiga, setModalRiga] = useState(false);
  const [rigaInModifica, setRigaInModifica] = useState<RigaRimborsoMissione | null>(null);

  const { data: rimborso, isLoading } = useQuery({
    queryKey: ['rimborso-missione', id],
    queryFn: () => rimborsiMissioneApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rimborso-missione', id] });
  };

  const invia = useMutation({
    mutationFn: () => rimborsiMissioneApi.invia(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Rimborso inviato per approvazione'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'invio')),
  });

  const approva = useMutation({
    mutationFn: (data: { luogo?: string; note?: string }) => rimborsiMissioneApi.approva(id!, data).then(r => r.data),
    onSuccess: () => { invalidate(); setModalApprova(false); setLuogo(''); setNoteAppr(''); message.success('Approvato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'approvazione')),
  });

  const rigetta = useMutation({
    mutationFn: (mot: string) => rimborsiMissioneApi.rigetta(id!, mot).then(r => r.data),
    onSuccess: () => { invalidate(); setModalRigetto(false); setMotivazione(''); message.success('Rigettato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel rigetto')),
  });

  const riapri = useMutation({
    mutationFn: () => rimborsiMissioneApi.riapri(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Rimborso riaperto in bozza'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nella riapertura')),
  });

  const salvaRiga = useMutation({
    mutationFn: (values: RigaForm) => {
      const payload = {
        data_inizio: values.data_inizio.format('YYYY-MM-DD'),
        data_fine: values.data_fine.format('YYYY-MM-DD'),
        attivita: values.attivita,
        importo: values.importo,
      };
      if (rigaInModifica) {
        return rimborsiMissioneApi.aggiornaRiga(rigaInModifica.id, payload).then(r => r.data);
      }
      return rimborsiMissioneApi.creaRiga(id!, payload).then(r => r.data);
    },
    onSuccess: () => {
      invalidate(); setModalRiga(false); setRigaInModifica(null); form.resetFields();
      message.success(rigaInModifica ? 'Riga aggiornata' : 'Riga aggiunta');
    },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const eliminaRiga = useMutation({
    mutationFn: (rigaId: string) => rimborsiMissioneApi.eliminaRiga(rigaId).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Riga eliminata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const uploadDocRiga = useMutation({
    mutationFn: ({ rigaId, file }: { rigaId: string; file: File }) =>
      rimborsiMissioneApi.uploadDocumentoRiga(rigaId, file),
    onSuccess: () => { invalidate(); message.success('Documento caricato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel caricamento')),
  });

  const uploadScheda = useMutation({
    mutationFn: (file: File) => rimborsiMissioneApi.uploadSchedaFinanziaria(id!, file),
    onSuccess: () => { invalidate(); message.success('Scheda finanziaria caricata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel caricamento')),
  });

  const uploadAllegato = useMutation({
    mutationFn: (file: File) => rimborsiMissioneApi.uploadAllegato(id!, file).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Allegato caricato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel caricamento')),
  });

  if (isLoading || !rimborso) return <Spin />;

  const r: RimborsoMissione = rimborso;
  const stato = r.stato;
  const statoConf = STATI_CONFIG[stato] ?? { label: stato, color: 'default' };
  const isSuperAdmin = user?.ruolo === 'superadmin';

  const isRichiedente = user?.id === r.richiedente_id;
  const puoBozzaModifica = isRichiedente && stato === 'bozza';
  const puoInviare = isRichiedente && stato === 'bozza' && r.righe.length > 0;
  const puoRiaprire = isRichiedente && stato === 'rigettata';

  // Mostra i pulsanti approva/rigetta quando il rimborso è in attesa di un approvatore
  // Il server verifica i permessi effettivi; qui filtriamo solo per ruolo generico
  const mostraWorkflow = stato !== 'bozza' && stato !== 'approvata' && stato !== 'rigettata' &&
    (
      (user?.ruolo === 'amministrativo' && stato === 'attesa_ammin') ||
      (stato === 'attesa_pi' && ['pi', 'superadmin'].includes(user?.ruolo ?? '')) ||
      (stato === 'attesa_dir_dip') ||
      (user?.ruolo === 'direttore_generale' && stato === 'attesa_dg') ||
      isSuperAdmin
    );
  const luogoObbligatorio = stato === 'attesa_pi';

  const stepIdx = STATI_FLOW.indexOf(stato);

  const colRighe = [
    { title: 'Dal', dataIndex: 'data_inizio', width: 100, render: (v: string) => formatData(v) },
    { title: 'Al', dataIndex: 'data_fine', width: 100, render: (v: string) => formatData(v) },
    { title: 'Attività / Descrizione', dataIndex: 'attivita' },
    {
      title: 'Importo', dataIndex: 'importo', width: 110, align: 'right' as const,
      render: (v: number) => formatEuro(v),
    },
    {
      title: 'Documento', width: 180, align: 'center' as const,
      render: (_: unknown, riga: RigaRimborsoMissione) => (
        <Space size={2}>
          {riga.ha_documento && (
            <>
              <Text ellipsis={{ tooltip: riga.documento_nome }} style={{ maxWidth: 90, fontSize: 12 }}>
                {riga.documento_nome}
              </Text>
              <Button size="small" type="text" icon={<EyeOutlined />}
                onClick={() => apriFile(`${env.apiUrl}/api/v1/rimborsi-missione/righe/${riga.id}/documento`)} />
              <Button size="small" type="text" icon={<DownloadOutlined />}
                onClick={() => scaricaFile(`${env.apiUrl}/api/v1/rimborsi-missione/righe/${riga.id}/documento`, riga.documento_nome ?? 'documento')} />
            </>
          )}
          {puoBozzaModifica && (
            <Upload maxCount={1} showUploadList={false}
              beforeUpload={file => { uploadDocRiga.mutate({ rigaId: riga.id, file }); return false; }}>
              <Button size="small" type="text" icon={<PaperClipOutlined />}
                title={riga.ha_documento ? 'Sostituisci' : 'Allega'} />
            </Upload>
          )}
        </Space>
      ),
    },
    {
      title: '', width: 80,
      render: (_: unknown, riga: RigaRimborsoMissione) => puoBozzaModifica ? (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />}
            onClick={() => {
              setRigaInModifica(riga);
              form.setFieldsValue({
                data_inizio: riga.data_inizio ? dayjs(riga.data_inizio) : undefined,
                data_fine: riga.data_fine ? dayjs(riga.data_fine) : undefined,
                attivita: riga.attivita,
                importo: riga.importo,
              } as unknown as RigaForm);
              setModalRiga(true);
            }} />
          <Popconfirm title="Elimina riga?" onConfirm={() => eliminaRiga.mutate(riga.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) : null,
    },
  ];

  const colAllegati = [
    { title: 'File', render: (_: unknown, a: AllegatoMissione) => (
      <Text ellipsis={{ tooltip: a.file_nome_originale }} style={{ maxWidth: 220 }}>
        {a.file_nome_originale ?? '—'}
      </Text>
    )},
    { title: 'Caricato da', dataIndex: 'caricato_da_nome', width: 160 },
    { title: 'Data', dataIndex: 'created_at', width: 110, render: (v: string) => formatData(v) },
    { title: '', width: 80, render: (_: unknown, a: AllegatoMissione) => (
      <Space size={4}>
        <Button size="small" type="text" icon={<EyeOutlined />}
          onClick={() => apriFile(`${env.apiUrl}/api/v1/missioni/allegati/${a.id}`)} />
        <Button size="small" type="text" icon={<DownloadOutlined />}
          onClick={() => scaricaFile(`${env.apiUrl}/api/v1/missioni/allegati/${a.id}`, a.file_nome_originale ?? 'allegato')} />
      </Space>
    )},
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <Button icon={<ArrowLeftOutlined />} type="link" style={{ marginBottom: 8, paddingLeft: 0 }}
        onClick={() => navigate(`/missioni/${r.missione_id}`)}>
        Torna alla missione
      </Button>

      <Row justify="space-between" align="top" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Rimborso spese missione</Title>
          <Space style={{ marginTop: 4 }}>
            <Tag color={statoConf.color}>{statoConf.label}</Tag>
            <Text type="secondary">Richiedente: {r.richiedente_nome}</Text>
            {r.ciclo > 1 && <Tag color="warning">Ciclo {r.ciclo}</Tag>}
          </Space>
        </Col>
        <Col>
          <Space wrap>
            {r.ha_scheda_finanziaria && (
              <Button icon={<DownloadOutlined />}
                onClick={() => scaricaFile(`${env.apiUrl}/api/v1/rimborsi-missione/${id}/scheda-finanziaria`, 'scheda_finanziaria.pdf')}>
                Scheda finanziaria
              </Button>
            )}
            {r.ha_pdf && (
              <Button icon={<FilePdfOutlined />}
                onClick={() => scaricaFile(`${env.apiUrl}/api/v1/rimborsi-missione/${id}/pdf`, `rimborso_missione_${id}.pdf`)}>
                Scarica PDF
              </Button>
            )}
            {puoInviare && (
              <Popconfirm title="Inviare il rimborso per approvazione?" onConfirm={() => invia.mutate()}>
                <Button type="primary" icon={<SendOutlined />} loading={invia.isPending}>Invia</Button>
              </Popconfirm>
            )}
            {puoRiaprire && (
              <Popconfirm title="Riaprire il rimborso come bozza?" onConfirm={() => riapri.mutate()}>
                <Button icon={<RedoOutlined />} loading={riapri.isPending}>Riapri</Button>
              </Popconfirm>
            )}
            {mostraWorkflow && (
              <>
                <Button type="primary" icon={<CheckOutlined />} onClick={() => setModalApprova(true)}>
                  Approva
                </Button>
                <Button danger icon={<CloseOutlined />} onClick={() => setModalRigetto(true)}>
                  Rigetta
                </Button>
              </>
            )}
          </Space>
        </Col>
      </Row>

      {stato !== 'rigettata' && (
        <Card style={{ marginBottom: 16 }}>
          <Steps
            size="small"
            current={stepIdx === -1 ? STATI_FLOW.length : stepIdx}
            items={STATI_FLOW.map(s => ({ title: STATI_CONFIG[s]?.label ?? s }))}
          />
        </Card>
      )}

      {stato === 'rigettata' && (
        <Alert type="error" showIcon message="Rimborso rigettato"
          description={r.step_approvazione.filter(s => s.decisione === 'rigettato').map(s => s.note).join(' — ') || undefined}
          style={{ marginBottom: 16 }} />
      )}

      {/* Righe rimborso */}
      <Card
        title={`Voci di rimborso — Totale: ${formatEuro(r.totale)}`}
        style={{ marginBottom: 16 }}
        extra={puoBozzaModifica && (
          <Button size="small" type="primary" icon={<PlusOutlined />}
            onClick={() => { setRigaInModifica(null); form.resetFields(); setModalRiga(true); }}>
            Aggiungi riga
          </Button>
        )}
      >
        <Table
          size="small" rowKey="id" pagination={false}
          dataSource={r.righe} columns={colRighe}
          locale={{ emptyText: 'Nessuna voce inserita' }}
          summary={() => r.righe.length > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <Text strong>Totale</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Text strong>{formatEuro(r.totale)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={2} />
            </Table.Summary.Row>
          ) : null}
        />
      </Card>

      {/* Scheda finanziaria */}
      <Card title="Scheda finanziaria" style={{ marginBottom: 16 }}
        extra={
          <Upload maxCount={1} showUploadList={false}
            beforeUpload={file => { uploadScheda.mutate(file); return false; }}>
            <Button size="small" icon={<PaperClipOutlined />}>
              {r.ha_scheda_finanziaria ? 'Sostituisci' : 'Carica scheda'}
            </Button>
          </Upload>
        }>
        {r.ha_scheda_finanziaria ? (
          <Text type="success">Scheda finanziaria caricata</Text>
        ) : (
          <Text type="secondary">Nessuna scheda caricata</Text>
        )}
      </Card>

      {/* Iter approvazione */}
      {r.step_approvazione.length > 0 && (
        <Card title="Iter di approvazione" style={{ marginBottom: 16 }}>
          <Table
            size="small" rowKey="id" pagination={false}
            dataSource={r.step_approvazione}
            columns={[
              { title: 'Ruolo', dataIndex: 'ruolo', width: 180, render: (v: string) => RUOLO_LABEL[v] ?? v },
              { title: 'Approvatore', dataIndex: 'approvatore_nome' },
              { title: 'Decisione', dataIndex: 'decisione', width: 110,
                render: (v: string) => <Tag color={v === 'approvato' ? 'success' : 'error'}>{v.toUpperCase()}</Tag> },
              { title: 'Luogo', dataIndex: 'luogo_firma', width: 130 },
              { title: 'Note', dataIndex: 'note' },
              { title: 'Data', dataIndex: 'decided_at', width: 110, render: (v: string) => formatData(v) },
            ]}
          />
        </Card>
      )}

      {/* Allegati */}
      <Card title="Allegati" style={{ marginBottom: 16 }}
        extra={
          <Upload maxCount={1} showUploadList={false}
            beforeUpload={file => { uploadAllegato.mutate(file); return false; }}>
            <Button size="small" icon={<PaperClipOutlined />}>Aggiungi</Button>
          </Upload>
        }>
        <Table
          size="small" rowKey="id" pagination={false}
          dataSource={r.allegati} columns={colAllegati}
          locale={{ emptyText: 'Nessun allegato' }}
        />
      </Card>

      {/* Modal riga */}
      <Modal
        title={rigaInModifica ? 'Modifica riga' : 'Aggiungi riga di rimborso'}
        open={modalRiga}
        onCancel={() => { setModalRiga(false); setRigaInModifica(null); form.resetFields(); }}
        onOk={() => form.validateFields().then(v => salvaRiga.mutate(v))}
        okText={rigaInModifica ? 'Salva' : 'Aggiungi'}
        okButtonProps={{ loading: salvaRiga.isPending }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="data_fine" label="Data fine" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="attivita" label="Attività / Descrizione" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="importo" label="Importo (€)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={v => parseFloat(v?.replace(/\./g, '').replace(',', '.') ?? '0') as 0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal approvazione */}
      <Modal
        title="Approva rimborso"
        open={modalApprova}
        onCancel={() => { setModalApprova(false); setLuogo(''); setNoteAppr(''); }}
        onOk={() => approva.mutate({ luogo, note: noteAppr || undefined })}
        okText="Approva"
        okButtonProps={{ loading: approva.isPending, disabled: luogoObbligatorio && !luogo.trim() }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Luogo{luogoObbligatorio ? ' *' : ''}:</Text>
            <Input style={{ marginTop: 4 }} value={luogo} onChange={e => setLuogo(e.target.value)} />
          </div>
          <div>
            <Text strong>Note (opzionale):</Text>
            <TextArea rows={2} style={{ marginTop: 4 }} value={noteAppr} onChange={e => setNoteAppr(e.target.value)} />
          </div>
        </Space>
      </Modal>

      {/* Modal rigetto */}
      <Modal
        title="Rigetta rimborso"
        open={modalRigetto}
        onCancel={() => { setModalRigetto(false); setMotivazione(''); }}
        onOk={() => rigetta.mutate(motivazione)}
        okText="Rigetta"
        okType="danger"
        okButtonProps={{ loading: rigetta.isPending, disabled: !motivazione.trim() }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>Motivazione del rigetto (obbligatoria):</Text>
          <TextArea rows={3} value={motivazione} onChange={e => setMotivazione(e.target.value)} />
        </Space>
      </Modal>
    </div>
  );
}
