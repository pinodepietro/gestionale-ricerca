import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography, Button, Space, Tag, Card, Steps, Modal,
  Input, InputNumber, DatePicker, Row, Col, Alert, Table, message,
  Popconfirm, Spin, Upload,
} from 'antd';
import {
  ArrowLeftOutlined, CheckOutlined, CloseOutlined, SendOutlined,
  RedoOutlined, FilePdfOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, PaperClipOutlined, EyeOutlined, DownloadOutlined,
  SaveOutlined, WarningOutlined,
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

const LABEL_APPROVA: Record<string, string> = {
  attesa_ammin:   'Approvazione Ammin. Progetto',
  attesa_pi:      'Approvazione Resp. Scientifico',
  attesa_dir_dip: 'Approvazione Dir. Dipartimento',
  attesa_dg:      'Approvazione Dir. Generale',
};

const RUOLO_LABEL: Record<string, string> = {
  ammin: 'Resp. Ammin.', pi: 'Resp. Scientifico', dir_dip: 'Dir. Dipartimento', dg: 'Dir. Generale',
};

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
  if (!resp.ok) { message.error("Errore nell'apertura"); return; }
  const blob = await resp.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

interface RigaEditState {
  data_inizio: dayjs.Dayjs | null;
  data_fine: dayjs.Dayjs | null;
  attivita: string;
  importo: number | null;
}

const RIGA_VUOTA: RigaEditState = { data_inizio: null, data_fine: null, attivita: '', importo: null };

export function RimborsoMissioneDettaglioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);

  const [luogo, setLuogo] = useState('Napoli');
  const [noteAppr, setNoteAppr] = useState('');
  const [modalRigetto, setModalRigetto] = useState(false);
  const [motivazione, setMotivazione] = useState('');

  const [editingRigaId, setEditingRigaId] = useState<string | null>(null);
  const [mostraFormRiga, setMostraFormRiga] = useState(false);
  const [rigaEdit, setRigaEdit] = useState<RigaEditState>(RIGA_VUOTA);
  const [dateError, setDateError] = useState('');

  const [noteLocale, setNoteLocale] = useState('');

  const { data: rimborso, isLoading, isFetching } = useQuery({
    queryKey: ['rimborso-missione', id],
    queryFn: () => rimborsiMissioneApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (rimborso) setNoteLocale(rimborso.note ?? '');
  }, [rimborso?.id]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rimborso-missione', id] });

  const salvaBozza = useMutation({
    mutationFn: () => rimborsiMissioneApi.update(id!, { note: noteLocale }).then(r => r.data),
    onSuccess: (res) => { queryClient.setQueryData(['rimborso-missione', id], res.data); message.success('Bozza salvata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel salvataggio')),
  });

  const invia = useMutation({
    mutationFn: () => rimborsiMissioneApi.invia(id!).then(r => r.data),
    onSuccess: (res) => { queryClient.setQueryData(['rimborso-missione', id], res.data); message.success('Rimborso inviato per approvazione'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, "Errore nell'invio")),
  });

  const approva = useMutation({
    mutationFn: (data: { luogo?: string; note?: string }) => rimborsiMissioneApi.approva(id!, data).then(r => r.data),
    onSuccess: (res) => {
      queryClient.setQueryData(['rimborso-missione', id], res.data);
      setLuogo('Napoli'); setNoteAppr('');
      message.success('Approvato');
    },
    onError: (e: unknown) => message.error(apiErrorMessage(e, "Errore nell'approvazione")),
  });

  const rigetta = useMutation({
    mutationFn: (mot: string) => rimborsiMissioneApi.rigetta(id!, mot).then(r => r.data),
    onSuccess: (res) => { queryClient.setQueryData(['rimborso-missione', id], res.data); setModalRigetto(false); setMotivazione(''); message.success('Rigettato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel rigetto')),
  });

  const riapri = useMutation({
    mutationFn: () => rimborsiMissioneApi.riapri(id!).then(r => r.data),
    onSuccess: (res) => { queryClient.setQueryData(['rimborso-missione', id], res.data); message.success('Rimborso riaperto in bozza'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nella riapertura')),
  });

  const salvaRiga = useMutation({
    mutationFn: () => {
      const payload = {
        data_inizio: rigaEdit.data_inizio!.format('YYYY-MM-DD'),
        data_fine: rigaEdit.data_fine!.format('YYYY-MM-DD'),
        attivita: rigaEdit.attivita.trim(),
        importo: rigaEdit.importo ?? undefined,
      };
      if (editingRigaId) return rimborsiMissioneApi.aggiornaRiga(editingRigaId, payload).then(r => r.data);
      return rimborsiMissioneApi.creaRiga(id!, payload).then(r => r.data);
    },
    onSuccess: (res) => {
      queryClient.setQueryData(['rimborso-missione', id], res.data);
      setMostraFormRiga(false); setEditingRigaId(null); setRigaEdit(RIGA_VUOTA); setDateError('');
      message.success(editingRigaId ? 'Riga aggiornata' : 'Riga aggiunta');
    },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const eliminaRiga = useMutation({
    mutationFn: (rigaId: string) => rimborsiMissioneApi.eliminaRiga(rigaId).then(r => r.data),
    onSuccess: (res) => { queryClient.setQueryData(['rimborso-missione', id], res.data); message.success('Riga eliminata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const uploadDocRiga = useMutation({
    mutationFn: ({ rigaId, file }: { rigaId: string; file: File }) =>
      rimborsiMissioneApi.uploadDocumentoRiga(rigaId, file),
    onSuccess: () => { invalidate(); message.success('Documento caricato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel caricamento')),
  });

  const uploadAllegato = useMutation({
    mutationFn: (file: File) => rimborsiMissioneApi.uploadAllegato(id!, file).then(r => r.data),
    onSuccess: (res) => { queryClient.setQueryData(['rimborso-missione', id], res.data); message.success('Allegato caricato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel caricamento')),
  });

  if (isLoading || !rimborso) return <Spin />;

  const r: RimborsoMissione = rimborso;
  const stato = r.stato;
  const statoConf = STATI_CONFIG[stato] ?? { label: stato, color: 'default' };
  const isSuperAdmin = user?.ruolo === 'superadmin';

  const isRichiedente = user?.id === r.richiedente_id;
  const isAmmin = isSuperAdmin || (!!r.ammin_id && user?.id === r.ammin_id);
  const isPi = isSuperAdmin || (!!r.pi_id && user?.id === r.pi_id);
  const isDirDip = isSuperAdmin || (!!r.dir_dip_id && user?.id === r.dir_dip_id);
  const isDg = isSuperAdmin || user?.ruolo === 'direttore_generale';

  const isApprovatore = (isAmmin || isPi || isDirDip || isDg) && !isRichiedente;

  const puoBozzaModifica = isRichiedente && stato === 'bozza';
  const puoInviare = isRichiedente && stato === 'bozza' && r.righe.length > 0;
  const puoRiaprire = isRichiedente && stato === 'rigettata';

  // Copertura economica
  const importoStimato = r.importo_stimato_missione ?? 0;
  const totale = r.totale;
  const eccedenza = totale > importoStimato ? totale - importoStimato : 0;
  const disponibilita = r.disponibilita_voce ?? 0;
  const haCopertura = eccedenza === 0 || disponibilita >= eccedenza;
  const nonHaCopertura = eccedenza > 0 && disponibilita < eccedenza;

  const puoApprovareBase = !isFetching && (
    (isAmmin && stato === 'attesa_ammin') ||
    (isPi && stato === 'attesa_pi') ||
    (isDirDip && stato === 'attesa_dir_dip') ||
    (isDg && stato === 'attesa_dg')
  );
  // Blocco copertura: solo per l'admin al passo attesa_ammin
  const amminBloccato = isAmmin && stato === 'attesa_ammin' && nonHaCopertura;
  const puoApprovare = puoApprovareBase && !amminBloccato;

  const stepIdx = STATI_FLOW.indexOf(stato);
  const labelApprova = LABEL_APPROVA[stato] ?? 'Approvazione';

  const handleDataChange = (field: 'data_inizio' | 'data_fine', value: dayjs.Dayjs | null) => {
    const updated = { ...rigaEdit, [field]: value };
    setRigaEdit(updated);
    if (updated.data_inizio && updated.data_fine && updated.data_fine.isBefore(updated.data_inizio)) {
      setDateError('La data fine deve essere uguale o successiva alla data inizio');
    } else {
      setDateError('');
    }
  };

  const rigaFormValida = rigaEdit.data_inizio && rigaEdit.data_fine && rigaEdit.attivita.trim() && !dateError;

  const avviaModificaRiga = (riga: RigaRimborsoMissione) => {
    setEditingRigaId(riga.id);
    setRigaEdit({
      data_inizio: riga.data_inizio ? dayjs(riga.data_inizio) : null,
      data_fine: riga.data_fine ? dayjs(riga.data_fine) : null,
      attivita: riga.attivita,
      importo: riga.importo ?? null,
    });
    setDateError('');
    setMostraFormRiga(true);
  };

  const annullaFormRiga = () => {
    setMostraFormRiga(false); setEditingRigaId(null); setRigaEdit(RIGA_VUOTA); setDateError('');
  };

  const colRighe = [
    { title: 'Dal', dataIndex: 'data_inizio', width: 100, render: (v: string) => formatData(v) },
    { title: 'Al', dataIndex: 'data_fine', width: 100, render: (v: string) => formatData(v) },
    { title: 'Attività / Descrizione', dataIndex: 'attivita' },
    {
      title: 'Importo', dataIndex: 'importo', width: 110, align: 'right' as const,
      render: (v: number) => formatEuro(v),
    },
    {
      title: 'Giustificativo', width: 180, align: 'center' as const,
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
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => avviaModificaRiga(riga)} />
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
          {r.missione_titolo && <Text type="secondary">{r.missione_titolo}</Text>}
          <Space style={{ marginTop: 4, display: 'flex' }}>
            <Tag color={statoConf.color}>{statoConf.label}</Tag>
            <Text type="secondary">Richiedente: {r.richiedente_nome}</Text>
            {r.ciclo > 1 && <Tag color="warning">Ciclo {r.ciclo}</Tag>}
          </Space>
        </Col>
        <Col>
          <Space wrap>
            {r.ha_pdf && (
              <Button icon={<FilePdfOutlined />}
                onClick={() => scaricaFile(`${env.apiUrl}/api/v1/rimborsi-missione/${id}/pdf`, `rimborso_missione_${id}.pdf`)}>
                Scarica PDF
              </Button>
            )}
            {puoBozzaModifica && (
              <Button icon={<SaveOutlined />} loading={salvaBozza.isPending} onClick={() => salvaBozza.mutate()}>
                Salva bozza
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

      {/* Copertura economica — solo per approvatori */}
      {isApprovatore && stato !== 'bozza' && stato !== 'rigettata' && (
        <Card title="Copertura economica" style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col span={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>Voce di costo</Text>
              <div><Text strong>{r.voce_descrizione ?? r.voce_impegno_missione ?? '—'}</Text></div>
            </Col>
            <Col span={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>Importo richiesta missione</Text>
              <div><Text strong>{formatEuro(importoStimato)}</Text></div>
            </Col>
            <Col span={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>Totale rimborso richiesto</Text>
              <div>
                <Text strong style={{ color: eccedenza > 0 ? '#d46b08' : undefined }}>
                  {formatEuro(totale)}
                </Text>
                {eccedenza > 0 && (
                  <Text type="warning" style={{ fontSize: 12, marginLeft: 8 }}>
                    (+{formatEuro(eccedenza)} rispetto alla richiesta)
                  </Text>
                )}
              </div>
            </Col>
          </Row>

          {nonHaCopertura && (
            <Alert
              type="error"
              showIcon
              message="LA RICHIESTA NON HA COPERTURA ECONOMICA"
              description={`Il totale del rimborso supera l'importo autorizzato di ${formatEuro(eccedenza)} e la disponibilità residua sulla voce di costo è insufficiente (disponibile: ${formatEuro(disponibilita)}).`}
              style={{ marginTop: 12 }}
            />
          )}
          {eccedenza > 0 && haCopertura && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={`Il totale del rimborso supera l'importo autorizzato di ${formatEuro(eccedenza)}`}
              description={`La disponibilità residua sulla voce di costo è sufficiente (disponibile: ${formatEuro(disponibilita)}). È possibile procedere con l'approvazione.`}
              style={{ marginTop: 12 }}
            />
          )}
        </Card>
      )}

      {/* Card approvazione inline */}
      {puoApprovareBase && (
        <Card
          title={labelApprova}
          style={{ marginBottom: 16, borderColor: nonHaCopertura ? '#ff4d4f' : '#1677ff', borderWidth: 2 }}
          styles={{ header: { background: nonHaCopertura ? '#fff2f0' : '#e6f4ff' } }}
        >
          {amminBloccato && (
            <Text type="danger" style={{ display: 'block', marginBottom: 12 }}>
              Approvazione bloccata: copertura economica insufficiente.
            </Text>
          )}
          <Row gutter={16} align="bottom">
            <Col span={7}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>Luogo</Text>
              <Input value={luogo} onChange={e => setLuogo(e.target.value)} placeholder="es. Napoli" />
            </Col>
            <Col span={11}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>Note (opzionale)</Text>
              <Input value={noteAppr} onChange={e => setNoteAppr(e.target.value)} />
            </Col>
            <Col span={6}>
              <Space>
                <Button type="primary" icon={<CheckOutlined />} loading={approva.isPending}
                  disabled={!puoApprovare}
                  onClick={() => approva.mutate({ luogo, note: noteAppr || undefined })}>
                  Conferma
                </Button>
                <Button danger icon={<CloseOutlined />} onClick={() => setModalRigetto(true)}>
                  Rigetta
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Note bozza */}
      {puoBozzaModifica && (
        <Card title="Note" style={{ marginBottom: 16 }}>
          <TextArea rows={3} value={noteLocale} onChange={e => setNoteLocale(e.target.value)}
            placeholder="Note aggiuntive (opzionale)" />
        </Card>
      )}
      {!puoBozzaModifica && r.note && (
        <Card title="Note" style={{ marginBottom: 16 }}>
          <Text>{r.note}</Text>
        </Card>
      )}

      {/* Righe rimborso */}
      <Card
        title={`Voci di rimborso — Totale: ${formatEuro(r.totale)}`}
        style={{ marginBottom: 16 }}
        extra={puoBozzaModifica && !mostraFormRiga && (
          <Button size="small" type="primary" icon={<PlusOutlined />}
            onClick={() => { setEditingRigaId(null); setRigaEdit(RIGA_VUOTA); setDateError(''); setMostraFormRiga(true); }}>
            Aggiungi riga
          </Button>
        )}
      >
        <Table
          size="small" rowKey="id" pagination={false}
          dataSource={r.righe} columns={colRighe}
          locale={{ emptyText: 'Nessuna voce inserita' }}
          rowClassName={row => row.id === editingRigaId ? 'ant-table-row-selected' : ''}
          summary={() => r.righe.length > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}><Text strong>Totale</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><Text strong>{formatEuro(r.totale)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={2} />
            </Table.Summary.Row>
          ) : null}
        />

        {/* Form inline aggiunta/modifica riga */}
        {mostraFormRiga && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: 6, border: '1px solid #d9d9d9' }}>
            <Text strong style={{ display: 'block', marginBottom: 10 }}>
              {editingRigaId ? 'Modifica riga' : 'Nuova riga di rimborso'}
            </Text>
            <Row gutter={12} align="bottom">
              <Col span={5}>
                <Text style={{ fontSize: 12 }}>Data inizio *</Text>
                <DatePicker style={{ width: '100%', marginTop: 2 }} format="DD/MM/YYYY"
                  value={rigaEdit.data_inizio}
                  onChange={v => handleDataChange('data_inizio', v)}
                  status={dateError ? 'error' : undefined}
                />
              </Col>
              <Col span={5}>
                <Text style={{ fontSize: 12 }}>Data fine *</Text>
                <DatePicker style={{ width: '100%', marginTop: 2 }} format="DD/MM/YYYY"
                  value={rigaEdit.data_fine}
                  onChange={v => handleDataChange('data_fine', v)}
                  status={dateError ? 'error' : undefined}
                />
              </Col>
              <Col span={8}>
                <Text style={{ fontSize: 12 }}>Attività / Descrizione *</Text>
                <Input style={{ marginTop: 2 }} value={rigaEdit.attivita}
                  onChange={e => setRigaEdit(r => ({ ...r, attivita: e.target.value }))}
                  placeholder="es. Partecipazione convegno" />
              </Col>
              <Col span={4}>
                <Text style={{ fontSize: 12 }}>Importo (€)</Text>
                <InputNumber style={{ width: '100%', marginTop: 2 }} min={0} precision={2}
                  value={rigaEdit.importo}
                  onChange={v => setRigaEdit(e => ({ ...e, importo: v ?? null }))}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={v => parseFloat(v?.replace(/\./g, '').replace(',', '.') ?? '0') as 0}
                />
              </Col>
              <Col span={2}>
                <Space direction="vertical" size={4} style={{ marginTop: 2 }}>
                  <Button type="primary" size="small" icon={<CheckOutlined />}
                    disabled={!rigaFormValida} loading={salvaRiga.isPending}
                    onClick={() => salvaRiga.mutate()} />
                  <Button size="small" icon={<CloseOutlined />} onClick={annullaFormRiga} />
                </Space>
              </Col>
            </Row>
            {dateError && (
              <Text type="danger" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>{dateError}</Text>
            )}
          </div>
        )}
      </Card>

      {/* Iter approvazione */}
      {r.step_approvazione.length > 0 && (
        <Card title="Iter di approvazione" style={{ marginBottom: 16 }}>
          <Table size="small" rowKey="id" pagination={false}
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
        <Table size="small" rowKey="id" pagination={false}
          dataSource={r.allegati} columns={colAllegati}
          locale={{ emptyText: 'Nessun allegato' }}
        />
      </Card>

      {/* Modal rigetto */}
      <Modal title="Rigetta rimborso" open={modalRigetto}
        onCancel={() => { setModalRigetto(false); setMotivazione(''); }}
        onOk={() => rigetta.mutate(motivazione)}
        okText="Rigetta" okType="danger"
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
