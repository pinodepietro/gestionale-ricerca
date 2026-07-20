// frontend/src/pages/dashboard/DashboardPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Card, Tag, Typography, Space, Spin, Alert, List, Button, Divider, Empty, App } from 'antd';
import { WarningOutlined, FileTextOutlined, ArrowLeftOutlined, ProjectOutlined,
         PlusOutlined, EditOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { env } from '../../config/env';
import { budgetApi } from '../../api/budget';
import { salApi } from '../../api/sal';
import { timesheetApi } from '../../api/timesheet';
import { progettiApi } from '../../api/progetti';
import { formatEuro, formatData } from '../../utils/formatters';
import { queryKeys } from '../../utils/queryKeys';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

interface ProgettoKPI {
  id: string; acronimo: string; codice: string; titolo: string; tipo: string;
  data_inizio: string; data_fine: string;
  pianificato: number; rendicontato: number;
  pct_rendicontato: number; pct_speso: number; percentuale_tempo: number;
  importo_finanziato: number; costo_totale: number;
  spese_documentate: number;
  pi_nome?: string;
}
interface CruscottoData {
  progetti_attivi: number; timesheet_pendenti: number; sal_in_scadenza: number;
  spese_totali: number; budget_pianificato: number; budget_rendicontato: number;
  pct_rendicontato: number; pct_speso: number;
  costo_totale_portfolio: number; importo_finanziato_portfolio: number;
  progetti: ProgettoKPI[];
}

function colore(pct: number) {
  if (pct < 60) return '#52c41a';
  if (pct < 85) return '#faad14';
  return '#ff4d4f';
}

// ── KPI Card stile A ──────────────────────────────────────────────────────────
function GaugeCard({ label, value, pct, color, sub, exact }: {
  label: string; value: string; pct: number; color: string; sub?: string; exact?: string;
}) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${color}`, borderRadius: 12,
      padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{label}</Text>
      <svg viewBox="0 0 130 130" width="130" height="130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#D3D1C7" strokeWidth="13"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="13"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.6s' }}/>
        <text x="65" y="62" textAnchor="middle" fontSize="22" fontWeight="500" fill={color}>{value}</text>
        {sub && <text x="65" y="78" textAnchor="middle" fontSize="10" fill="#888">{sub}</text>}
      </svg>
      {exact && (
        <Text style={{ fontSize: 12, fontWeight: 600, color, marginTop: 4, textAlign: 'center' }}>
          {exact}
        </Text>
      )}
    </div>
  );
}

function KpiBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${color}`, borderRadius: 12, padding: '14px 16px' }}>
      <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>{label}</Text>
      <div style={{ fontSize: 26, fontWeight: 500, color }}>{value}</div>
    </div>
  );
}

// ── Dettaglio progetto ────────────────────────────────────────────────────────
function DashboardProgetto({ progetto, onBack }: { progetto: ProgettoKPI; onBack: () => void }) {
  const navigate = useNavigate();
  const { notification } = App.useApp();

  const { data: budgetVoci } = useQuery({
    queryKey: queryKeys.progetti.budget(progetto.id),
    queryFn: () => budgetApi.voci.list(progetto.id).then(r => r.data.data),
  });
  const { data: salData } = useQuery({
    queryKey: queryKeys.sal.byProgetto(progetto.id),
    queryFn: () => salApi.list(progetto.id).then(r => r.data.data),
  });
  const { data: tsData } = useQuery({
    queryKey: queryKeys.timesheet.list({ progetto_id: progetto.id }),
    queryFn: () => timesheetApi.list({ progetto_id: progetto.id }).then(r => Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []),
  });
  const { data: speseData } = useQuery({
    queryKey: queryKeys.progetti.spese(progetto.id),
    queryFn: () => budgetApi.spese.list(progetto.id).then(r => r.data.data),
  });

  const tsItems = ((tsData as { data?: unknown[] } | undefined)?.data ?? (tsData as unknown[]) ?? []) as { stato: string }[];
  const tsPendenti = tsItems.filter(t => t.stato === 'inviato').length;
  const speseTotali = speseData?.filter((s: { stato: string }) => s.stato === 'registrata')
    .reduce((sum: number, s: { importo: number }) => sum + s.importo, 0) ?? 0;
  const salInScadenza = salData?.filter((s: { stato: string; data_scadenza_rendiconto?: string }) => {
    if (!s.data_scadenza_rendiconto || !['aperto','chiuso'].includes(s.stato)) return false;
    const gg = Math.ceil((new Date(s.data_scadenza_rendiconto).getTime() - Date.now()) / 86400000);
    return gg >= 0 && gg <= 30;
  }).length ?? 0;

  const giorni = progetto.data_fine
    ? Math.ceil((new Date(progetto.data_fine).getTime() - Date.now()) / 86400000)
    : null;

  const speseDaUsare = progetto.spese_documentate || speseTotali;
  const limiteSpese = progetto.importo_finanziato || progetto.pianificato;
  const pctSpese = progetto.pct_speso || (limiteSpese > 0
    ? Math.round(speseDaUsare / limiteSpese * 1000) / 10
    : 0);

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="link" onClick={onBack}
        style={{ paddingLeft: 0, marginBottom: 8 }}>
        Tutti i progetti
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Space align="center" wrap>
            <Title level={2} style={{ margin: 0 }}>{progetto.acronimo}</Title>
            <Tag color="blue">{progetto.tipo}</Tag>
            {giorni !== null && giorni >= 0 && giorni <= 30 && <Tag color="orange">{giorni}gg alla scadenza</Tag>}
            {giorni !== null && giorni < 0 && <Tag color="red">Scaduto</Tag>}
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>{progetto.titolo}</Text>
          <div style={{ display: 'flex', gap: 32, marginTop: 10 }}>
            <Text style={{ fontSize: 15, color: '#888' }}>Costo progetto:
              <strong style={{ fontSize: 17, color: '#333', marginLeft: 8 }}>
                € {((progetto.costo_totale || progetto.pianificato || 0) / 1000).toFixed(0)}k
              </strong>
            </Text>
            <Text style={{ fontSize: 15, color: '#888' }}>Importo finanziato:
              <strong style={{ fontSize: 17, color: '#185FA5', marginLeft: 8 }}>
                € {((progetto.importo_finanziato || 0) / 1000).toFixed(0)}k
              </strong>
            </Text>
            <Text style={{ fontSize: 15, color: '#888' }}>Cofinanziamento:
              <strong style={{ fontSize: 17, color: '#555', marginLeft: 8 }}>
                € {(((progetto.costo_totale || progetto.pianificato || 0) - (progetto.importo_finanziato || 0)) / 1000).toFixed(0)}k
              </strong>
            </Text>
          </div>
        </div>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={async () => {
              const token = localStorage.getItem('access_token');
              const res = await fetch(
                `${env.apiUrl}/api/v1/progetti/${progetto.id}/riepilogo-dashboard/xlsx`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (!res.ok) {
                notification.error({ message: 'Errore nella generazione del riepilogo' });
                return;
              }
              const blob = await res.blob();
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `Riepilogo_${progetto.acronimo}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.xlsx`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Stampa riepilogo
          </Button>
          <Button type="primary" onClick={() => navigate(`/progetti/${progetto.id}`)}>
            Apri scheda progetto →
          </Button>
        </Space>
      </div>

      {/* Alert */}
      {(tsPendenti > 0 || salInScadenza > 0) && (
        <Row gutter={12} style={{ marginBottom: 20 }}>
          {tsPendenti > 0 && (
            <Col span={12}>
              <Alert type="info" showIcon icon={<FileTextOutlined />}
                message={`${tsPendenti} timesheet in attesa di approvazione`}
                action={<Text style={{ cursor: 'pointer', color: '#185FA5' }}
                  onClick={() => navigate('/timesheet')}>Vai →</Text>} />
            </Col>
          )}
          {salInScadenza > 0 && (
            <Col span={12}>
              <Alert type="warning" showIcon icon={<WarningOutlined />}
                message={`${salInScadenza} SAL in scadenza entro 30 giorni`} />
            </Col>
          )}
        </Row>
      )}

      {/* Righe gauge */}
      {(() => {
        const coloreBudget = '#185FA5';
        const coloreSpese = '#1D9E75';
        const coloreTempo = progetto.percentuale_tempo > 85 ? '#E24B4A' : '#BA7517';

        const dataInizio = progetto.data_inizio ? new Date(progetto.data_inizio) : null;
        const dataFine = progetto.data_fine ? new Date(progetto.data_fine) : null;
        const durataGg = dataInizio && dataFine ? Math.round((dataFine.getTime() - dataInizio.getTime()) / 86400000) : 0;
        const trascorsiGg = dataInizio ? Math.round((Date.now() - dataInizio.getTime()) / 86400000) : 0;

        const voci = (budgetVoci as { importo_previsto: number; importo_impegnato?: number; importo_speso?: number }[] | undefined) ?? [];
        const totalePianificato = voci.reduce((s, v) => s + v.importo_previsto, 0);
        const totaleImpegnato   = voci.reduce((s, v) => s + (v.importo_impegnato ?? 0), 0);
        const totaleSpeso       = voci.reduce((s, v) => s + (v.importo_speso ?? 0), 0);
        const totaleDisponibile = Math.max(0, totalePianificato - totaleImpegnato - totaleSpeso);

        const pctImpegnato   = totalePianificato > 0 ? Math.round(totaleImpegnato   / totalePianificato * 1000) / 10 : 0;
        const pctSpeso2      = totalePianificato > 0 ? Math.round(totaleSpeso        / totalePianificato * 1000) / 10 : 0;
        const pctDisponibile = totalePianificato > 0 ? Math.round(totaleDisponibile  / totalePianificato * 1000) / 10 : 0;

        return (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <GaugeCard
                  label="Rendicontato / Pianificato"
                  value={`${progetto.pct_rendicontato}%`}
                  pct={progetto.pct_rendicontato}
                  color={coloreBudget}
                  exact={`${formatEuro(progetto.rendicontato)} / ${formatEuro(progetto.pianificato)}`}
                />
              </Col>
              <Col span={8}>
                <GaugeCard
                  label="Spese vs Contributo"
                  value={`${pctSpese}%`}
                  pct={pctSpese}
                  color={coloreSpese}
                  exact={`${formatEuro(speseDaUsare)} / ${formatEuro(limiteSpese)}`}
                />
              </Col>
              <Col span={8}>
                <GaugeCard
                  label="Tempo trascorso"
                  value={`${progetto.percentuale_tempo}%`}
                  pct={progetto.percentuale_tempo}
                  color={coloreTempo}
                  exact={`${trascorsiGg}gg trascorsi / ${durataGg}gg totali`}
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <GaugeCard
                  label="Spese (totale)"
                  value={`${pctSpeso2}%`}
                  pct={pctSpeso2}
                  color="#E8863A"
                  exact={formatEuro(totaleSpeso)}
                />
              </Col>
              <Col span={8}>
                <GaugeCard
                  label="Impegnato (totale)"
                  value={`${pctImpegnato}%`}
                  pct={pctImpegnato}
                  color="#722ed1"
                  exact={formatEuro(totaleImpegnato)}
                />
              </Col>
              <Col span={8}>
                <GaugeCard
                  label="Disponibile (totale)"
                  value={`${pctDisponibile}%`}
                  pct={pctDisponibile}
                  color="#13c2c2"
                  exact={formatEuro(totaleDisponibile)}
                />
              </Col>
            </Row>
          </>
        );
      })()}

      {/* Riga 2: 2 KPI box */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <KpiBox label="Timesheet pendenti" value={tsPendenti}
            color={tsPendenti > 0 ? '#185FA5' : '#888'} />
        </Col>
        <Col span={12}>
          <KpiBox label="SAL in scadenza" value={salInScadenza}
            color={salInScadenza > 0 ? '#E24B4A' : '#888'} />
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Budget per voce */}
        <Col span={14}>
          <Card title="Budget per voce di costo" bordered
            style={{ borderRadius: 12, borderColor: '#e0e0e0' }}>
            {!budgetVoci?.length && <Text type="secondary">Nessuna voce configurata</Text>}
            {budgetVoci?.map((v: {
              id: string;
              voce?: { descrizione: string };
              importo_rendicontato: number;
              importo_previsto: number;
              percentuale_utilizzata: number;
            }) => (
              <div key={v.id} style={{ marginBottom: 14 }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Text style={{ fontSize: 13, color: '#333' }}>{v.voce?.descrizione ?? '—'}</Text>
                  <Text style={{ fontSize: 12, color: '#555' }}>
                    {formatEuro(v.importo_rendicontato)} / {formatEuro(v.importo_previsto)}
                  </Text>
                </Space>
                <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 4 }}>
                  <div style={{
                    height: 4,
                    width: `${Math.min(v.percentuale_utilizzata, 100)}%`,
                    background: colore(v.percentuale_utilizzata),
                    borderRadius: 2,
                  }} />
                </div>
                <Text style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>{v.percentuale_utilizzata}%</Text>
              </div>
            ))}
          </Card>
        </Col>

        {/* SAL */}
        <Col span={10}>
          <Card title="Stato SAL" bordered style={{ borderRadius: 12, borderColor: '#e0e0e0' }}>
            {!salData?.length && <Text type="secondary">Nessun SAL creato</Text>}
            <List
              size="small"
              dataSource={salData ?? []}
              renderItem={(s: { id: string; numero: number; data_inizio: string; data_fine: string; stato: string }) => (
                <List.Item
                  extra={
                    <Tag color={s.stato === 'aperto' ? 'green' : s.stato === 'chiuso' ? 'orange' :
                      s.stato === 'rendicontato' ? 'purple' : 'blue'}>
                      {s.stato}
                    </Tag>
                  }
                >
                  <Text strong style={{ marginRight: 8 }}>SAL {s.numero}</Text>
                  <Text style={{ fontSize: 12, color: '#555' }}>
                    {formatData(s.data_inizio)} → {formatData(s.data_fine)}
                  </Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// ── Dashboard ricercatore ─────────────────────────────────────────────────────
const COLORI_STATO_TS: Record<string, string> = {
  bozza: 'default', inviato: 'blue', approvato: 'green', rifiutato: 'red',
};
const MESI_TS = ['','Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function DashboardRicercatore() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const { data: progettiData, isLoading: loadingP } = useQuery({
    queryKey: ['cruscotto-globale'],
    queryFn: () => apiClient.get<{ data: CruscottoData }>('/progetti/cruscotto').then(r => r.data.data),
  });

  const { data: tsData, isLoading: loadingTs } = useQuery({
    queryKey: queryKeys.timesheet.list({}),
    queryFn: () => timesheetApi.list({}).then(r => (r.data as { data: unknown[] }).data ?? []),
  });

  const progetti = progettiData?.progetti ?? [];
  const allTs = (tsData ?? []) as { id: string; mese: number; anno: number; stato: string; progetto_id: string }[];
  const timesheet = allTs.slice(0, 8);
  const tsPendenti = allTs.filter(t => t.stato === 'inviato').length;
  const tsRifiutati = allTs.filter(t => t.stato === 'rifiutato').length;

  if (loadingP || loadingTs) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Ciao, {user?.nome} 👋
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/timesheet')}>
          Nuovo timesheet
        </Button>
      </div>

      {(tsPendenti > 0 || tsRifiutati > 0) && (
        <Row gutter={12} style={{ marginBottom: 20 }}>
          {tsPendenti > 0 && (
            <Col span={12}>
              <Alert type="info" showIcon
                message={`${tsPendenti} timesheet in attesa di approvazione`}
                action={<Button size="small" type="link" onClick={() => navigate('/timesheet')}>Vai →</Button>} />
            </Col>
          )}
          {tsRifiutati > 0 && (
            <Col span={12}>
              <Alert type="error" showIcon
                message={`${tsRifiutati} timesheet rifiutati — da correggere`}
                action={<Button size="small" type="link" onClick={() => navigate('/timesheet')}>Vai →</Button>} />
            </Col>
          )}
        </Row>
      )}

      <Row gutter={[16, 16]}>
        {/* Progetti */}
        <Col span={12}>
          <Card title={<Space><ProjectOutlined />Progetti in cui partecipi</Space>}
            bordered style={{ borderRadius: 12, borderColor: '#e0e0e0' }}>
            {progetti.length === 0
              ? <Empty description="Nessun progetto attivo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              : progetti.map(p => {
                  const giorni = p.data_fine
                    ? Math.ceil((new Date(p.data_fine).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                      onClick={() => navigate(`/progetti/${p.id}`)}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <div>
                          <Text strong>{p.acronimo}</Text>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{p.titolo}</Text>
                          {p.pi_nome && <Text style={{ fontSize: 11, color: '#185FA5' }}>PI: {p.pi_nome}</Text>}
                        </div>
                        <Space direction="vertical" align="end" size={2}>
                          {giorni !== null && giorni >= 0 && giorni <= 30 && <Tag color="orange">{giorni}gg</Tag>}
                          {giorni !== null && giorni < 0 && <Tag color="red">Scaduto</Tag>}
                          <Button size="small" type="link" style={{ padding: 0 }}
                            onClick={e => { e.stopPropagation(); navigate(`/timesheet?progetto_id=${p.id}`); }}>
                            Nuovo TS →
                          </Button>
                        </Space>
                      </Space>
                    </div>
                  );
                })
            }
          </Card>
        </Col>

        {/* Timesheet recenti */}
        <Col span={12}>
          <Card title={<Space><FileTextOutlined />I miei timesheet recenti</Space>}
            bordered style={{ borderRadius: 12, borderColor: '#e0e0e0' }}
            extra={<Button type="link" size="small" onClick={() => navigate('/timesheet')}>Vedi tutti</Button>}>
            {timesheet.length === 0
              ? <Empty description="Nessun timesheet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              : <List
                  size="small"
                  dataSource={timesheet}
                  renderItem={(ts: { id: string; mese: number; anno: number; stato: string; progetto_id: string }) => {
                    const prog = progetti.find(p => p.id === ts.progetto_id);
                    return (
                      <List.Item
                        style={{ cursor: 'pointer', padding: '8px 0' }}
                        onClick={() => navigate(`/timesheet/${ts.id}`)}
                        extra={<Tag color={COLORI_STATO_TS[ts.stato]}>{ts.stato}</Tag>}
                      >
                        <List.Item.Meta
                          avatar={<EditOutlined style={{ fontSize: 16, color: '#888', marginTop: 4 }} />}
                          title={<Text style={{ fontSize: 13 }}>{MESI_TS[ts.mese]} {ts.anno}</Text>}
                          description={<Text type="secondary" style={{ fontSize: 12 }}>
                            {prog?.acronimo ?? '—'}
                          </Text>}
                        />
                      </List.Item>
                    );
                  }}
                />
            }
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// ── Dashboard PI ──────────────────────────────────────────────────────────────
function DashboardPI() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [progettoSelezionato, setProgettoSelezionato] = useState<ProgettoKPI | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cruscotto-globale'],
    queryFn: () => apiClient.get<{ data: CruscottoData }>('/progetti/cruscotto').then(r => r.data.data),
    refetchInterval: 120000,
  });

  const { data: tsData } = useQuery({
    queryKey: queryKeys.timesheet.list({ stato: 'inviato' }),
    queryFn: () => timesheetApi.list({ stato: 'inviato' }).then(r =>
      (r.data as { data: unknown[] }).data ?? []
    ),
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  if (progettoSelezionato) {
    return <DashboardProgetto progetto={progettoSelezionato} onBack={() => setProgettoSelezionato(null)} />;
  }

  const d = data ?? { progetti_attivi: 0, timesheet_pendenti: 0, sal_in_scadenza: 0,
    spese_totali: 0, budget_pianificato: 0, budget_rendicontato: 0, pct_rendicontato: 0, pct_speso: 0,
    costo_totale_portfolio: 0, importo_finanziato_portfolio: 0, progetti: [] };

  const tsPendenti = (tsData as unknown[] ?? []).length;
  const salInScadenza = d.sal_in_scadenza;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Ciao, {user?.nome}</Title>
          <Text type="secondary">I tuoi progetti di ricerca</Text>
        </div>
        <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate('/timesheet')}>
          Timesheet
        </Button>
      </div>

      {/* Alert globali */}
      {(tsPendenti > 0 || salInScadenza > 0) && (
        <Row gutter={12} style={{ marginBottom: 20 }}>
          {tsPendenti > 0 && (
            <Col span={salInScadenza > 0 ? 12 : 24}>
              <Alert type="info" showIcon icon={<FileTextOutlined />}
                message={`${tsPendenti} timesheet in attesa di approvazione`}
                description="Revisiona e approva i timesheet del tuo team"
                action={
                  <Button size="small" type="primary" onClick={() => navigate('/timesheet')}>
                    Approva ora →
                  </Button>
                }
              />
            </Col>
          )}
          {salInScadenza > 0 && (
            <Col span={tsPendenti > 0 ? 12 : 24}>
              <Alert type="warning" showIcon icon={<WarningOutlined />}
                message={`${salInScadenza} SAL in scadenza entro 30 giorni`}
                description="Verifica i SAL aperti e procedi alla chiusura"
              />
            </Col>
          )}
        </Row>
      )}

      {/* KPI box */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <KpiBox label="Progetti attivi" value={d.progetti_attivi} color="#185FA5" />
        </Col>
        <Col span={8}>
          <KpiBox label="Timesheet da approvare" value={tsPendenti}
            color={tsPendenti > 0 ? '#185FA5' : '#888'} />
        </Col>
        <Col span={8}>
          <KpiBox label="SAL in scadenza" value={salInScadenza}
            color={salInScadenza > 0 ? '#E24B4A' : '#888'} />
        </Col>
      </Row>

      {/* Schede progetto */}
      {d.progetti.length === 0 ? (
        <Card bordered style={{ borderRadius: 12 }}>
          <Empty description="Nessun progetto attivo trovato" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {d.progetti.map(p => {
            const giorni = p.data_fine
              ? Math.ceil((new Date(p.data_fine).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <Col span={12} key={p.id}>
                <Card hoverable bordered onClick={() => setProgettoSelezionato(p)}
                  style={{ borderRadius: 12, borderColor: '#e0e0e0', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <Space wrap>
                        <Text strong style={{ fontSize: 16 }}>{p.acronimo}</Text>
                        <Tag color="blue" style={{ borderRadius: 20 }}>{p.tipo}</Tag>
                        {giorni !== null && giorni >= 0 && giorni <= 30 && <Tag color="orange">{giorni}gg</Tag>}
                        {giorni !== null && giorni < 0 && <Tag color="red">Scaduto</Tag>}
                      </Space>
                      <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 2 }}>
                        {p.titolo}
                      </Text>
                    </div>
                    <ProjectOutlined style={{ fontSize: 20, color: '#185FA5' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0 4px' }}>
                    <span style={{ fontSize: 12, color: '#888' }}>
                      Costo: <strong style={{ color: '#333' }}>€ {((p.costo_totale || p.pianificato || 0) / 1000).toFixed(0)}k</strong>
                    </span>
                    <span style={{ fontSize: 12, color: '#888' }}>
                      Finanziato: <strong style={{ color: '#185FA5' }}>€ {((p.importo_finanziato || 0) / 1000).toFixed(0)}k</strong>
                    </span>
                  </div>

                  <Divider style={{ margin: '10px 0' }} />

                  <Row gutter={12}>
                    <Col span={12}>
                      <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                        Rendicontato / Pianificato
                      </Text>
                      <Text strong style={{ fontSize: 18, color: colore(p.pct_rendicontato) }}>
                        {p.pct_rendicontato}%
                      </Text>
                      <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 6 }}>
                        <div style={{ height: 4, width: `${Math.min(p.pct_rendicontato, 100)}%`,
                          background: colore(p.pct_rendicontato), borderRadius: 2 }} />
                      </div>
                    </Col>
                    <Col span={12}>
                      <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                        Tempo trascorso
                      </Text>
                      <Text strong style={{ fontSize: 18, color: p.percentuale_tempo > 85 ? '#faad14' : '#185FA5' }}>
                        {p.percentuale_tempo}%
                      </Text>
                      <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 6 }}>
                        <div style={{ height: 4, width: `${p.percentuale_tempo}%`,
                          background: p.percentuale_tempo > 85 ? '#faad14' : '#185FA5', borderRadius: 2 }} />
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}

// ── Dashboard Direttore Generale ─────────────────────────────────────────────
function DashboardDG() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const { data: approvazioni } = useQuery({
    queryKey: ['cruscotto-dg'],
    queryFn: () => progettiApi.cruscottoDG().then(r => r.data.data),
    refetchInterval: 60000,
  });

  if (!approvazioni) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  const totale = approvazioni.totale || 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Ciao, {user?.nome}</Title>
        <Text type="secondary">Approvazioni in sospeso</Text>
      </div>

      {/* Alert globale */}
      {totale > 0 && (
        <Alert
          type="error"
          showIcon
          message={`${totale} approvazioni in sospeso`}
          description="Accedi alle sezioni sottostanti per completare le approvazioni"
          style={{ marginBottom: 24 }}
        />
      )}

      {/* KPI box */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4.8}>
          <KpiBox
            label="Timesheet"
            value={approvazioni.timesheet}
            color={approvazioni.timesheet > 0 ? '#185FA5' : '#888'}
          />
        </Col>
        <Col span={4.8}>
          <KpiBox
            label="Missioni"
            value={approvazioni.missioni}
            color={approvazioni.missioni > 0 ? '#E24B4A' : '#888'}
          />
        </Col>
        <Col span={4.8}>
          <KpiBox
            label="Rimborsi missione"
            value={approvazioni.rimborsi_missione}
            color={approvazioni.rimborsi_missione > 0 ? '#1D9E75' : '#888'}
          />
        </Col>
        <Col span={4.8}>
          <KpiBox
            label="Rimborsi spese"
            value={approvazioni.rimborsi_spesa}
            color={approvazioni.rimborsi_spesa > 0 ? '#722ed1' : '#888'}
          />
        </Col>
        <Col span={4.8}>
          <KpiBox
            label="Autorizzazioni"
            value={approvazioni.autorizzazioni_spesa}
            color={approvazioni.autorizzazioni_spesa > 0 ? '#faad14' : '#888'}
          />
        </Col>
      </Row>

      {/* Link alle sezioni */}
      <Row gutter={16}>
        {approvazioni.timesheet > 0 && (
          <Col span={12}>
            <Card
              hoverable
              onClick={() => navigate('/timesheet')}
              style={{ borderRadius: 12, borderColor: '#185FA5', cursor: 'pointer' }}
            >
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Text strong>Timesheet da approvare</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    {approvazioni.timesheet} timesheet in attesa della tua approvazione finale
                  </Text>
                </div>
                <FileTextOutlined style={{ fontSize: 24, color: '#185FA5' }} />
              </Space>
            </Card>
          </Col>
        )}
        {approvazioni.missioni > 0 && (
          <Col span={12}>
            <Card
              hoverable
              onClick={() => navigate('/missioni')}
              style={{ borderRadius: 12, borderColor: '#E24B4A', cursor: 'pointer' }}
            >
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Text strong>Missioni da approvare</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    {approvazioni.missioni} richieste missione in attesa della tua approvazione
                  </Text>
                </div>
                <ProjectOutlined style={{ fontSize: 24, color: '#E24B4A' }} />
              </Space>
            </Card>
          </Col>
        )}
        {approvazioni.rimborsi_missione > 0 && (
          <Col span={12}>
            <Card
              hoverable
              onClick={() => navigate('/rimborsi-missione')}
              style={{ borderRadius: 12, borderColor: '#1D9E75', cursor: 'pointer' }}
            >
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Text strong>Rimborsi missione da approvare</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    {approvazioni.rimborsi_missione} rimborsi in attesa della tua approvazione
                  </Text>
                </div>
                <FileTextOutlined style={{ fontSize: 24, color: '#1D9E75' }} />
              </Space>
            </Card>
          </Col>
        )}
        {approvazioni.rimborsi_spesa > 0 && (
          <Col span={12}>
            <Card
              hoverable
              onClick={() => navigate('/rimborsi-spese')}
              style={{ borderRadius: 12, borderColor: '#722ed1', cursor: 'pointer' }}
            >
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Text strong>Rimborsi spese da approvare</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    {approvazioni.rimborsi_spesa} rimborsi in attesa della tua approvazione
                  </Text>
                </div>
                <FileTextOutlined style={{ fontSize: 24, color: '#722ed1' }} />
              </Space>
            </Card>
          </Col>
        )}
        {approvazioni.autorizzazioni_spesa > 0 && (
          <Col span={12}>
            <Card
              hoverable
              onClick={() => navigate('/autorizzazioni-spesa')}
              style={{ borderRadius: 12, borderColor: '#faad14', cursor: 'pointer' }}
            >
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Text strong>Autorizzazioni spesa da approvare</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    {approvazioni.autorizzazioni_spesa} richieste in attesa della tua approvazione
                  </Text>
                </div>
                <FileTextOutlined style={{ fontSize: 24, color: '#faad14' }} />
              </Space>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}

// ── Lista progetti ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const [progettoSelezionato, setProgettoSelezionato] = useState<ProgettoKPI | null>(null);

  const { data: statoPi } = useQuery({
    queryKey: ['me', 'is-pi'],
    queryFn: () => apiClient.get<{ data: { is_pi: boolean } }>('/personale/me/is-pi').then(r => r.data.data.is_pi),
    enabled: user?.ruolo === 'ricercatore',
    staleTime: 5 * 60 * 1000,
  });

  if (user?.ruolo === 'direttore_generale') {
    return <DashboardDG />;
  }

  if (user?.ruolo === 'ricercatore') {
    if (statoPi === undefined) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
    if (statoPi) return <DashboardPI />;
    return <DashboardRicercatore />;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['cruscotto-globale'],
    queryFn: () => apiClient.get<{ data: CruscottoData }>('/progetti/cruscotto').then(r => r.data.data),
    refetchInterval: 120000,
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  if (progettoSelezionato) {
    return <DashboardProgetto progetto={progettoSelezionato} onBack={() => setProgettoSelezionato(null)} />;
  }

  const d = data ?? { progetti_attivi: 0, timesheet_pendenti: 0, sal_in_scadenza: 0,
    spese_totali: 0, budget_pianificato: 0, budget_rendicontato: 0, pct_rendicontato: 0, pct_speso: 0,
    costo_totale_portfolio: 0, importo_finanziato_portfolio: 0, progetti: [] };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Dashboard</Title>

      {d.progetti.length === 0 ? (
        <Card bordered style={{ borderRadius: 12 }}>
          <Text type="secondary">Nessun progetto attivo trovato per il tuo profilo.</Text>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {d.progetti.map(p => {
            const giorni = p.data_fine
              ? Math.ceil((new Date(p.data_fine).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <Col span={12} key={p.id}>
                <Card hoverable bordered onClick={() => setProgettoSelezionato(p)}
                  style={{ borderRadius: 12, borderColor: '#e0e0e0', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <Space wrap>
                        <Text strong style={{ fontSize: 16 }}>{p.acronimo}</Text>
                        <Tag color="blue" style={{ borderRadius: 20 }}>{p.tipo}</Tag>
                        {giorni !== null && giorni >= 0 && giorni <= 30 && <Tag color="orange">{giorni}gg</Tag>}
                        {giorni !== null && giorni < 0 && <Tag color="red">Scaduto</Tag>}
                      </Space>
                      <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 2 }}>
                        {p.titolo}
                      </Text>
                      {p.pi_nome && (
                        <Text style={{ display: 'block', fontSize: 12, marginTop: 4, color: '#185FA5' }}>
                          PI: {p.pi_nome}
                        </Text>
                      )}
                    </div>
                    <ProjectOutlined style={{ fontSize: 20, color: '#185FA5' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0 4px' }}>
                    <span style={{ fontSize: 12, color: '#888' }}>Costo progetto: <strong style={{ color: '#333' }}>€ {((p.costo_totale || p.pianificato || 0) / 1000).toFixed(0)}k</strong></span>
                    <span style={{ fontSize: 12, color: '#888' }}>Finanziato: <strong style={{ color: '#185FA5' }}>€ {((p.importo_finanziato || 0) / 1000).toFixed(0)}k</strong></span>
                  </div>

                  <Divider style={{ margin: '10px 0' }} />

                  <Row gutter={12}>
                    <Col span={12}>
                      <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                        Rendicontato / Pianificato
                      </Text>
                      <Text strong style={{ fontSize: 18, color: colore(p.pct_rendicontato) }}>
                        {p.pct_rendicontato}%
                      </Text>
                      <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 6 }}>
                        <div style={{ height: 4, width: `${Math.min(p.pct_rendicontato,100)}%`,
                          background: colore(p.pct_rendicontato), borderRadius: 2 }} />
                      </div>
                    </Col>
                    <Col span={12}>
                      <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                        Tempo trascorso
                      </Text>
                      <Text strong style={{ fontSize: 18, color: p.percentuale_tempo > 85 ? '#faad14' : '#185FA5' }}>
                        {p.percentuale_tempo}%
                      </Text>
                      <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 6 }}>
                        <div style={{ height: 4, width: `${p.percentuale_tempo}%`,
                          background: p.percentuale_tempo > 85 ? '#faad14' : '#185FA5', borderRadius: 2 }} />
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
