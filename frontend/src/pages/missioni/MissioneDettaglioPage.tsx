import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography, Button, Space, Tag, Descriptions, Card, Steps, Modal,
  Input, Row, Col, Alert, Table, message, Popconfirm, Spin, Upload,
} from 'antd';
import {
  ArrowLeftOutlined, CheckOutlined, CloseOutlined, SendOutlined,
  RedoOutlined, FilePdfOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, PaperClipOutlined, EyeOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { missioniApi, type Missione, type AllegatoMissione } from '../../api/missioni';
import { useAuthStore } from '../../store/useAuthStore';
import { formatData, formatEuro } from '../../utils/formatters';
import { apiErrorMessage } from '../../utils/apiError';
import { env } from '../../config/env';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATI_CONFIG: Record<string, { label: string; color: string }> = {
  bozza:          { label: 'Bozza',                   color: 'default' },
  attesa_ammin:   { label: 'Attesa Ammin. Progetto',  color: 'orange' },
  attesa_pi:      { label: 'Attesa Resp. Scientifico', color: 'blue' },
  attesa_dir_dip: { label: 'Attesa Dir. Dipartimento', color: 'purple' },
  attesa_dg:      { label: 'Attesa Dir. Generale',     color: 'geekblue' },
  approvata:      { label: 'Approvata',                color: 'success' },
  rigettata:      { label: 'Rigettata',                color: 'error' },
};

const STATI_FLOW = ['bozza', 'attesa_ammin', 'attesa_pi', 'attesa_dir_dip', 'attesa_dg', 'approvata'];

const MEZZO_LABEL: Record<string, string> = {
  ordinario: 'Mezzo ordinario',
  straordinario: 'Mezzo straordinario',
};

const COPERTURA_LABEL: Record<string, string> = {
  progetto: 'Progetto finanziato',
  strategico: 'Progetto strategico di Ateneo',
  altro: 'Altro',
};

const GRUPPO_LABEL: Record<string, string> = {
  A: 'Gruppo A',
  B: 'Gruppo B',
  C: 'Gruppo C',
};

const RUOLO_STEP_LABEL: Record<string, string> = {
  ammin: 'Ammin. Progetto', pi: 'Resp. Scientifico', dir_dip: 'Dir. Dipartimento', dg: 'Dir. Generale',
};

async function scaricaFile(url: string, nome: string) {
  const token = localStorage.getItem('access_token');
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) { message.error('Errore nel download'); return; }
  const blob = await resp.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
}

async function apriFile(url: string) {
  const token = localStorage.getItem('access_token');
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) { message.error('Errore nell\'apertura'); return; }
  const blob = await resp.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export function MissioneDettaglioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);

  const [luogo, setLuogo] = useState('Napoli');
  const [noteAppr, setNoteAppr] = useState('');
  const [modalRigetto, setModalRigetto] = useState(false);
  const [motivazione, setMotivazione] = useState('');

  const { data: missione, isLoading, isFetching } = useQuery({
    queryKey: ['missione', id],
    queryFn: () => missioniApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['missione', id] });
    queryClient.invalidateQueries({ queryKey: ['missioni'] });
  };

  const invia = useMutation({
    mutationFn: () => missioniApi.invia(id!).then(r => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['missione', id], data.data);
      invalidate();
      message.success('Missione inviata per approvazione');
    },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'invio')),
  });

  const approva = useMutation({
    mutationFn: (data: { luogo?: string; note?: string }) => missioniApi.approva(id!, data).then(r => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['missione', id], data.data);
      invalidate();
      setLuogo('Napoli');
      setNoteAppr('');
      message.success('Approvato');
    },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'approvazione')),
  });

  const rigetta = useMutation({
    mutationFn: (mot: string) => missioniApi.rigetta(id!, mot).then(r => r.data),
    onSuccess: () => { invalidate(); setModalRigetto(false); setMotivazione(''); message.success('Rigettato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel rigetto')),
  });

  const riapri = useMutation({
    mutationFn: () => missioniApi.riapri(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Missione riaperta'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nella riapertura')),
  });

  const uploadAllegato = useMutation({
    mutationFn: (file: File) => missioniApi.uploadAllegato(id!, file).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Allegato caricato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel caricamento')),
  });

  const eliminaAllegato = useMutation({
    mutationFn: (allegatoId: string) => missioniApi.eliminaAllegato(allegatoId).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Allegato eliminato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'eliminazione')),
  });

  const creaRimborso = useMutation({
    mutationFn: () => missioniApi.creaRimborso(id!).then(r => r.data),
    onSuccess: (data) => {
      invalidate();
      navigate(`/rimborsi-missione/${data.data.rimborso!.id}`);
    },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nella creazione del rimborso')),
  });

  if (isLoading || !missione) return <Spin />;

  const m: Missione = missione;
  const stato = m.stato;
  const statoConf = STATI_CONFIG[stato] ?? { label: stato, color: 'default' };
  const isSuperAdmin = user?.ruolo === 'superadmin';

  const isRichiedente = user?.id === m.richiedente_id;
  const isAmmin = user?.id === m.ammin_id || isSuperAdmin;
  const isPi = user?.id === m.pi_id || isSuperAdmin;
  const isDirDip = user?.id === m.dir_dip_id || isSuperAdmin;
  const isDg = user?.ruolo === 'direttore_generale' || isSuperAdmin;

  const puoModificare = isRichiedente && stato === 'bozza';
  const puoInviare = isRichiedente && stato === 'bozza';
  const puoApprovare = !isFetching && (
    (isAmmin && stato === 'attesa_ammin') ||
    (isPi && stato === 'attesa_pi') ||
    (isDirDip && stato === 'attesa_dir_dip') ||
    (isDg && stato === 'attesa_dg')
  );
  const puoRiaprire = isRichiedente && stato === 'rigettata';
  const luogoObbligatorio = stato === 'attesa_pi';
  const labelApprova =
    stato === 'attesa_ammin'   ? 'Verifica disponibilità di budget — Ammin. Progetto' :
    stato === 'attesa_pi'      ? 'Approvazione Responsabile Scientifico' :
    stato === 'attesa_dir_dip' ? 'Approvazione Direttore di Dipartimento' :
    stato === 'attesa_dg'      ? 'Approvazione Direttore Generale' : 'Approvazione';

  const stepIdx = STATI_FLOW.indexOf(stato);

  const colAllegati = [
    { title: 'File', render: (_: unknown, a: AllegatoMissione) => (
      <Text ellipsis={{ tooltip: a.file_nome_originale }} style={{ maxWidth: 220 }}>
        {a.file_nome_originale ?? '—'}
      </Text>
    )},
    { title: 'Caricato da', dataIndex: 'caricato_da_nome', width: 160 },
    { title: 'Data', dataIndex: 'created_at', width: 110, render: (v: string) => formatData(v) },
    { title: '', width: 90, render: (_: unknown, a: AllegatoMissione) => (
      <Space size={4}>
        <Button size="small" type="text" icon={<EyeOutlined />}
          onClick={() => apriFile(`${env.apiUrl}/api/v1/missioni/allegati/${a.id}`)} />
        <Button size="small" type="text" icon={<DownloadOutlined />}
          onClick={() => scaricaFile(`${env.apiUrl}/api/v1/missioni/allegati/${a.id}`, a.file_nome_originale ?? 'allegato')} />
        {(isRichiedente || isSuperAdmin) && (
          <Popconfirm title="Elimina allegato?" onConfirm={() => eliminaAllegato.mutate(a.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
      </Space>
    )},
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <Button icon={<ArrowLeftOutlined />} type="link" style={{ marginBottom: 8, paddingLeft: 0 }}
        onClick={() => navigate('/missioni')}>
        Tutte le missioni
      </Button>

      <Row justify="space-between" align="top" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>{m.titolo}</Title>
          <Space style={{ marginTop: 4 }}>
            <Tag color={statoConf.color}>{statoConf.label}</Tag>
            {m.progetto_codice && <Text type="secondary">{m.progetto_codice} — {m.progetto_titolo}</Text>}
          </Space>
        </Col>
        <Col>
          <Space wrap>
            {puoModificare && (
              <Button icon={<EditOutlined />} onClick={() => navigate(`/missioni/${id}/modifica`)}>
                Modifica
              </Button>
            )}
            {m.ha_pdf && (
              <Button icon={<FilePdfOutlined />}
                onClick={() => scaricaFile(`${env.apiUrl}/api/v1/missioni/${id}/pdf`, `missione_${id}.pdf`)}>
                Scarica PDF
              </Button>
            )}
            {puoInviare && (
              <Popconfirm title="Inviare la missione per approvazione?" onConfirm={() => invia.mutate()}>
                <Button type="primary" icon={<SendOutlined />} loading={invia.isPending}>
                  Invia
                </Button>
              </Popconfirm>
            )}
            {puoRiaprire && (
              <Popconfirm title="Riaprire la missione come bozza?" onConfirm={() => riapri.mutate()}>
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
            status={stato === 'rigettata' ? 'error' : undefined}
            items={STATI_FLOW.map(s => ({ title: STATI_CONFIG[s]?.label ?? s }))}
          />
        </Card>
      )}

      {puoApprovare && (
        <Card
          title={labelApprova}
          style={{ marginBottom: 16, borderColor: '#1677ff', borderWidth: 2 }}
          styles={{ header: { background: '#e6f4ff', fontWeight: 600 } }}
        >
          <Row gutter={16} align="bottom">
            <Col span={8}>
              <Text strong>Luogo{luogoObbligatorio ? ' *' : ''}</Text>
              <Input
                style={{ marginTop: 4 }}
                value={luogo}
                onChange={e => setLuogo(e.target.value)}
                placeholder="Es. Napoli"
              />
            </Col>
            <Col span={12}>
              <Text strong>Note (opzionale)</Text>
              <Input
                style={{ marginTop: 4 }}
                value={noteAppr}
                onChange={e => setNoteAppr(e.target.value)}
                placeholder="Note aggiuntive..."
              />
            </Col>
            <Col span={4} style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={approva.isPending}
                  disabled={luogoObbligatorio && !luogo.trim()}
                  onClick={() => approva.mutate({ luogo, note: noteAppr || undefined })}
                >
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

      {stato === 'rigettata' && (
        <Alert type="error" showIcon message="Missione rigettata"
          description={m.step_approvazione.filter(s => s.decisione === 'rigettato').map(s => s.note).join(' — ') || undefined}
          style={{ marginBottom: 16 }} />
      )}

      <Card title="Dettagli missione" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Richiedente" span={1}>
            {m.richiedente_nome}
            {m.gruppo_missione ? <Text type="secondary"> ({GRUPPO_LABEL[m.gruppo_missione] ?? `Gruppo ${m.gruppo_missione}`})</Text> : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Resp. Scientifico" span={1}>{m.pi_nome ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Destinazione" span={2}>{m.destinazione}</Descriptions.Item>
          <Descriptions.Item label="Data inizio" span={1}>
            {formatData(m.data_inizio)}{m.ora_inizio ? ` ore ${m.ora_inizio.substring(0, 5)}` : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Data fine" span={1}>
            {formatData(m.data_fine)}{m.ora_fine ? ` ore ${m.ora_fine.substring(0, 5)}` : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Motivo" span={2}>{m.motivo}</Descriptions.Item>
          <Descriptions.Item label="Mezzo di trasporto" span={1}>
            {MEZZO_LABEL[m.mezzo_tipo] ?? m.mezzo_tipo}
            {m.mezzo_descrizione ? ` — ${m.mezzo_descrizione}` : ''}
            {m.auto_alimentazione ? `, ${m.auto_alimentazione}` : ''}
            {m.auto_cilindrata ? ` ${m.auto_cilindrata}` : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Copertura finanziaria" span={1}>
            {COPERTURA_LABEL[m.copertura_tipo] ?? m.copertura_tipo}
            {m.copertura_descrizione ? ` — ${m.copertura_descrizione}` : ''}
          </Descriptions.Item>
          {m.motivazione_mezzo_straordinario && (
            <Descriptions.Item label="Motiv. mezzo straordinario" span={2}>
              {m.motivazione_mezzo_straordinario}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Importo stimato" span={1}>{formatEuro(m.importo_stimato)}</Descriptions.Item>
          <Descriptions.Item label="Voce impegno" span={1}>
            {m.voce_impegno === 'overhead' ? 'E.1 — Overhead' : 'D.1/D.2 — Missioni'}
          </Descriptions.Item>
          {m.luogo_approvazione && (
            <Descriptions.Item label="Luogo approvazione PI" span={2}>{m.luogo_approvazione}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {m.step_approvazione.length > 0 && (
        <Card title="Iter di approvazione" style={{ marginBottom: 16 }}>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={m.step_approvazione}
            columns={[
              { title: 'Ruolo', dataIndex: 'ruolo', width: 180, render: (v: string) => RUOLO_STEP_LABEL[v] ?? v },
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

      <Card title="Allegati" style={{ marginBottom: 16 }}
        extra={
          <Upload maxCount={1} showUploadList={false}
            beforeUpload={file => { uploadAllegato.mutate(file); return false; }}>
            <Button size="small" icon={<PaperClipOutlined />}>Aggiungi allegato</Button>
          </Upload>
        }>
        <Table
          size="small" rowKey="id" pagination={false}
          dataSource={m.allegati}
          columns={colAllegati}
          locale={{ emptyText: 'Nessun allegato' }}
        />
      </Card>

      {m.stato === 'approvata' && (
        <Card title="Rimborso spese missione" style={{ marginBottom: 16 }}>
          {m.rimborso ? (
            <Space>
              <Tag color={STATI_CONFIG[m.rimborso.stato]?.color ?? 'default'}>
                {STATI_CONFIG[m.rimborso.stato]?.label ?? m.rimborso.stato}
              </Tag>
              <Text>Totale: {formatEuro(m.rimborso.totale)}</Text>
              <Button type="link" onClick={() => navigate(`/rimborsi-missione/${m.rimborso!.id}`)}>
                Apri rimborso →
              </Button>
            </Space>
          ) : (
            <Space direction="vertical">
              <Text type="secondary">Nessun rimborso ancora creato per questa missione.</Text>
              {isRichiedente && (
                <Popconfirm title="Creare la richiesta di rimborso?" onConfirm={() => creaRimborso.mutate()}>
                  <Button type="primary" icon={<PlusOutlined />} loading={creaRimborso.isPending}>
                    Crea rimborso spese
                  </Button>
                </Popconfirm>
              )}
            </Space>
          )}
        </Card>
      )}

      {/* Modal rigetto */}
      <Modal
        title="Rigetta missione"
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
