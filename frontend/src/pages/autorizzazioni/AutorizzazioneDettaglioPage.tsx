import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography, Button, Space, Tag, Descriptions, Card, Steps, Modal,
  Input, Row, Col, Alert, Table, message, Popconfirm, Spin,
} from 'antd';
import {
  ArrowLeftOutlined, CheckOutlined, CloseOutlined, SendOutlined,
  RedoOutlined, FilePdfOutlined, WarningOutlined, EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autorizzazioniApi, type AutorizzazioneSpesa, type BudgetVoceDisponibile } from '../../api/autorizzazioni';
import { useAuthStore } from '../../store/useAuthStore';
import { formatData } from '../../utils/formatters';
import { apiErrorMessage } from '../../utils/apiError';
import { env } from '../../config/env';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATI_STEPS = [
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

const MACRO_LABEL: Record<string, string> = {
  personale: 'Macrocategoria Personale',
  spese_generali: 'Macrocategoria Spese Generali',
  consulenze_servizi: 'Macrocategoria Consulenze e/o Servizi',
  strumentazioni: 'Macrocategoria Strumentazioni e Attrezzature',
};

const QUALITA_LABEL: Record<string, string> = {
  professore_ordinario: 'Professore Ordinario',
  professore_associato: 'Professore Associato',
  ricercatore: 'Ricercatore',
};

const fmtEuro = (v: number) => {
  const p = v.toFixed(2).split('.');
  p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return p.join(',') + ' €';
};

export function AutorizzazioneDettaglioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);

  const [modalRigetto, setModalRigetto] = useState(false);
  const [motivazione, setMotivazione] = useState('');
  const [modalBudgetVoce, setModalBudgetVoce] = useState(false);
  const [budgetVoceSelezionata, setBudgetVoceSelezionata] = useState<string | undefined>();

  const isSuperAdmin = user?.ruolo === 'superadmin';

  const { data: ras, isLoading } = useQuery({
    queryKey: ['autorizzazione', id],
    queryFn: () => autorizzazioniApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: budgetVoci } = useQuery({
    queryKey: ['autorizzazione-budget-voci', id],
    queryFn: () => autorizzazioniApi.budgetVociDisponibili(id!).then(r => r.data.data),
    enabled: !!id && ras?.stato === 'attesa_ammin' && ras?.tipo === 'progetto'
      && (isSuperAdmin || ras?.amministrativo_id === user?.id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['autorizzazione', id] });
    queryClient.invalidateQueries({ queryKey: ['autorizzazioni'] });
  };

  const invia = useMutation({
    mutationFn: () => autorizzazioniApi.invia(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Richiesta inviata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'invio')),
  });

  const approvaAmmin = useMutation({
    mutationFn: () => autorizzazioniApi.approvaAmmin(id!, budgetVoceSelezionata!).then(r => r.data),
    onSuccess: () => { invalidate(); setModalBudgetVoce(false); message.success('Approvato — passato al Responsabile Scientifico'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nell\'approvazione')),
  });

  const approvaRs = useMutation({
    mutationFn: () => autorizzazioniApi.approvaRs(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Approvato — passato al Direttore di Dipartimento'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const approvaDirDip = useMutation({
    mutationFn: () => autorizzazioniApi.approvaDirDip(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Approvato — passato al Direttore Generale'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const approvaDg = useMutation({
    mutationFn: () => autorizzazioniApi.approvaDg(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Richiesta approvata — Impegno creato e PDF generato'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const rigetta = useMutation({
    mutationFn: () => autorizzazioniApi.rigetta(id!, motivazione).then(r => r.data),
    onSuccess: () => { invalidate(); setModalRigetto(false); setMotivazione(''); message.success('Richiesta rigettata'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel rigetto')),
  });

  const riapri = useMutation({
    mutationFn: () => autorizzazioniApi.riapri(id!).then(r => r.data),
    onSuccess: () => { invalidate(); message.success('Richiesta riaperta — puoi modificarla e reinviarla'); },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore')),
  });

  const scaricaPdf = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${env.apiUrl}/api/v1/autorizzazioni-spesa/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      message.error('Errore nello scaricamento del PDF');
      return;
    }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Autorizzazione_${id}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (isLoading || !ras) return <Spin style={{ display: 'block', marginTop: 60, textAlign: 'center' }} />;

  const r = ras as AutorizzazioneSpesa;
  const isOwner = r.richiedente_id === user?.id;
  const isDG = user?.ruolo === 'direttore_generale';
  const isAmministrativo = r.amministrativo_id === user?.id;
  const isPI = r.pi_id === user?.id;
  const isDirDip = r.direttore_dipartimento_id === user?.id;

  // L'utente è l'approvatore atteso per lo step corrente del flusso di firme.
  // Lo step del Direttore Generale non ammette override del superadmin.
  const puoApprovareStep =
    (r.stato === 'attesa_ammin' && (isAmministrativo || isSuperAdmin))
    || (r.stato === 'attesa_rs' && (isPI || isSuperAdmin))
    || (r.stato === 'attesa_dir_dip' && (isDirDip || isSuperAdmin))
    || (r.stato === 'attesa_dg' && isDG);

  // Step corrente nella barra di avanzamento
  const stepIdx = STATI_STEPS.findIndex(s => s.key === r.stato);
  const stepsItems = STATI_STEPS.map((s, idx) => ({
    title: s.label,
    status: r.stato === 'rigettata'
          ? (idx < stepIdx ? 'finish' as const : idx === stepIdx ? 'error' as const : 'wait' as const)
          : idx < stepIdx ? 'finish' as const
          : idx === stepIdx ? 'process' as const
          : 'wait' as const,
  }));

  // Colonna voce di budget per approvazione admin
  const colonneBudget = [
    { title: 'Voce', render: (_: unknown, v: BudgetVoceDisponibile) => `${v.codice} — ${v.descrizione}`, ellipsis: true },
    { title: 'Disponibile', dataIndex: 'disponibile', width: 130, align: 'right' as const, render: fmtEuro },
    { title: 'Richiesto', dataIndex: 'importo_richiesto', width: 120, align: 'right' as const, render: fmtEuro },
    {
      title: '', width: 90, align: 'center' as const,
      render: (_: unknown, v: BudgetVoceDisponibile) =>
        v.sufficiente
          ? <Tag color="success">✓ OK</Tag>
          : <Tag color="warning" icon={<WarningOutlined />}>Insuff.</Tag>,
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/autorizzazioni')}>Indietro</Button>
            <div>
              <Title level={3} style={{ margin: 0 }}>{r.oggetto}</Title>
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
            {/* Richiedente: modifica bozza */}
            {r.stato === 'bozza' && isOwner && (
              <Button icon={<EditOutlined />} onClick={() => navigate(`/autorizzazioni/${id}/modifica`)}>
                Modifica
              </Button>
            )}
            {/* Richiedente: invia da bozza */}
            {r.stato === 'bozza' && isOwner && (
              <Button type="primary" icon={<SendOutlined />} loading={invia.isPending} onClick={() => invia.mutate()}>
                Invia per approvazione
              </Button>
            )}
            {/* Richiedente: riapri dopo rigetto */}
            {r.stato === 'rigettata' && isOwner && (
              <Button icon={<RedoOutlined />} loading={riapri.isPending} onClick={() => riapri.mutate()}>
                Riapri e correggi
              </Button>
            )}
            {/* RS: approva */}
            {r.stato === 'attesa_rs' && puoApprovareStep && (
              <Button type="primary" icon={<CheckOutlined />} loading={approvaRs.isPending} onClick={() => approvaRs.mutate()}>
                Approva
              </Button>
            )}
            {/* Dir. Dip.: approva */}
            {r.stato === 'attesa_dir_dip' && puoApprovareStep && (
              <Button type="primary" icon={<CheckOutlined />} loading={approvaDirDip.isPending} onClick={() => approvaDirDip.mutate()}>
                Approva
              </Button>
            )}
            {/* DG: approva */}
            {r.stato === 'attesa_dg' && puoApprovareStep && (
              <Popconfirm
                title="Approvare definitivamente?"
                description="Verrà creato un Impegno sul budget del progetto e generato il PDF."
                onConfirm={() => approvaDg.mutate()}
                okText="Approva" cancelText="Annulla"
              >
                <Button type="primary" icon={<CheckOutlined />} loading={approvaDg.isPending}>
                  Approva definitivamente
                </Button>
              </Popconfirm>
            )}
            {/* Rigetta (solo per gli step successivi all'ammin) */}
            {['attesa_rs','attesa_dir_dip','attesa_dg'].includes(r.stato) && puoApprovareStep && (
              <Button danger icon={<CloseOutlined />} onClick={() => setModalRigetto(true)}>
                Rigetta
              </Button>
            )}
            {/* PDF */}
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

      {/* Avviso doppio ruolo: l'utente ha già approvato uno step precedente e può approvare quello corrente */}
      {r.stato === 'attesa_dir_dip' && isPI && isDirDip && (
        <Alert
          type="info" showIcon style={{ marginBottom: 16 }}
          message="Hai già approvato come Responsabile Scientifico"
          description="Ricopri anche il ruolo di Direttore di Dipartimento per questo progetto. Puoi procedere con l'approvazione del passo corrente."
        />
      )}
      {r.stato === 'attesa_dg' && isDirDip && isDG && (
        <Alert
          type="info" showIcon style={{ marginBottom: 16 }}
          message="Hai già approvato come Direttore di Dipartimento"
          description="Ricopri anche il ruolo di Direttore Generale. Puoi procedere con l'approvazione definitiva."
        />
      )}

      {/* Card verifica budget — solo per l'amministrativo allo step attesa_ammin */}
      {r.stato === 'attesa_ammin' && puoApprovareStep && (
        <Card
          title="Verifica disponibilità di budget — Resp. Amministrativo"
          style={{ marginBottom: 16, borderColor: '#1677ff', borderWidth: 2 }}
          styles={{ header: { background: '#e6f4ff', fontWeight: 600 } }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Seleziona la voce di budget su cui imputare l'impegno di <Text strong>{fmtEuro(r.importo)}</Text>.
          </Text>
          <Table
            dataSource={(budgetVoci as BudgetVoceDisponibile[] | undefined) ?? []}
            columns={colonneBudget}
            rowKey="id"
            size="small"
            pagination={false}
            rowClassName={(v: BudgetVoceDisponibile) => v.sufficiente ? '' : 'ant-table-row-disabled'}
            onRow={(v: BudgetVoceDisponibile) => ({
              onClick: () => { if (v.sufficiente) setBudgetVoceSelezionata(v.id); },
              style: {
                cursor: v.sufficiente ? 'pointer' : 'not-allowed',
                opacity: v.sufficiente ? 1 : 0.45,
                background: budgetVoceSelezionata === v.id ? '#e6f4ff' : undefined,
              },
            })}
          />
          {budgetVoceSelezionata && (
            <Alert type="info" style={{ marginTop: 12 }}
              message={`Voce selezionata: ${(budgetVoci as BudgetVoceDisponibile[] | undefined)?.find(v => v.id === budgetVoceSelezionata)?.codice} — ${(budgetVoci as BudgetVoceDisponibile[] | undefined)?.find(v => v.id === budgetVoceSelezionata)?.descrizione}`}
            />
          )}
          <Row justify="end" style={{ marginTop: 16 }}>
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={approvaAmmin.isPending}
                disabled={!budgetVoceSelezionata}
                onClick={() => approvaAmmin.mutate()}
              >
                Conferma e approva
              </Button>
              <Button danger icon={<CloseOutlined />} onClick={() => setModalRigetto(true)}>
                Rigetta
              </Button>
            </Space>
          </Row>
        </Card>
      )}

      {/* Dettaglio richiedente */}
      <Card title="Richiedente" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Nome">{r.richiedente_nome}</Descriptions.Item>
          <Descriptions.Item label="In qualità di">{QUALITA_LABEL[r.qualita_richiedente] ?? r.qualita_richiedente}</Descriptions.Item>
          <Descriptions.Item label="A tempo">{r.tipo_contratto === 'pieno' ? 'Pieno' : 'Definito'}</Descriptions.Item>
          <Descriptions.Item label="Dipartimento">{r.dipartimento_nome ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Dettaglio progetto */}
      <Card title={r.tipo === 'progetto' ? 'Progetto' : 'Fondi individuali'} style={{ marginBottom: 16 }}>
        {r.tipo === 'progetto' ? (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Titolo" span={2}>{r.progetto_titolo ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="CUP">{r.progetto_cup ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Qualità nel progetto">{r.qualita_progetto ?? '—'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">Richiesta su fondi individuali — nessun progetto associato</Text>
        )}
      </Card>

      {/* Dettaglio spesa */}
      <Card title="Tipo di spesa e dettagli" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Macrocategoria" span={2}>{MACRO_LABEL[r.macrocategoria] ?? r.macrocategoria}</Descriptions.Item>
          <Descriptions.Item label="Voce" span={2}>
            {r.voce_lettera.toUpperCase()}{r.voce_altro ? ` — ${r.voce_altro}` : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Oggetto" span={2}>{r.oggetto}</Descriptions.Item>
          <Descriptions.Item label="Descrizione" span={2}>{r.descrizione}</Descriptions.Item>
          <Descriptions.Item label="Importo"><Text strong>{fmtEuro(r.importo)}</Text></Descriptions.Item>
          <Descriptions.Item label="Anticipazione spesa">{r.anticipazione_spesa ? 'SÌ' : 'NO'}</Descriptions.Item>
          {r.durata_da && <Descriptions.Item label="Durata">{formatData(r.durata_da)} → {r.durata_a ? formatData(r.durata_a) : '—'}</Descriptions.Item>}
          {r.termini_pagamento && <Descriptions.Item label="Termini pagamento">{r.termini_pagamento}</Descriptions.Item>}
          {r.budget_voce_id && (
            <Descriptions.Item label="Voce budget assegnata" span={2}>
              <Tag color="blue">
                {r.budget_voce_codice
                  ? `${r.budget_voce_codice} — ${r.budget_voce_descrizione}`
                  : 'Assegnata dall\'amministrativo'}
              </Tag>
            </Descriptions.Item>
          )}
        </Descriptions>
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

      {/* Modal selezione voce budget (admin) */}
      <Modal
        open={modalBudgetVoce}
        title="Seleziona voce di budget"
        width={700}
        onCancel={() => setModalBudgetVoce(false)}
        onOk={() => {
          if (!budgetVoceSelezionata) { message.warning('Seleziona una voce di budget'); return; }
          approvaAmmin.mutate();
        }}
        okText="Approva"
        cancelText="Annulla"
        confirmLoading={approvaAmmin.isPending}
        okButtonProps={{ disabled: !budgetVoceSelezionata }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Seleziona la voce di budget su cui imputare l'impegno di <Text strong>{fmtEuro(r.importo)}</Text>.
          Le voci con disponibilità insufficiente non possono essere selezionate.
        </Text>
        <Table
          dataSource={budgetVoci as BudgetVoceDisponibile[] | undefined ?? []}
          columns={colonneBudget}
          rowKey="id"
          size="small"
          pagination={false}
          rowClassName={(v: BudgetVoceDisponibile) => v.sufficiente ? '' : 'ant-table-row-disabled'}
          onRow={(v: BudgetVoceDisponibile) => ({
            onClick: () => { if (v.sufficiente) setBudgetVoceSelezionata(v.id); },
            style: {
              cursor: v.sufficiente ? 'pointer' : 'not-allowed',
              opacity: v.sufficiente ? 1 : 0.45,
              background: budgetVoceSelezionata === v.id ? '#e6f4ff' : undefined,
            },
          })}
        />
        {budgetVoceSelezionata && (
          <Alert type="info" style={{ marginTop: 12 }}
            message={`Voce selezionata: ${(budgetVoci as BudgetVoceDisponibile[] | undefined)?.find(v => v.id === budgetVoceSelezionata)?.codice} — ${(budgetVoci as BudgetVoceDisponibile[] | undefined)?.find(v => v.id === budgetVoceSelezionata)?.descrizione}`}
          />
        )}
      </Modal>
    </div>
  );
}
