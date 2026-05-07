// frontend/src/pages/dashboard/DashboardPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Card, Progress, Tag, Typography, Space, Spin, Alert, List, Button, Divider } from 'antd';
import { WarningOutlined, FileTextOutlined, ArrowLeftOutlined, ProjectOutlined,
         EuroOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { budgetApi } from '../../api/budget';
import { salApi } from '../../api/sal';
import { timesheetApi } from '../../api/timesheet';
import { formatEuro, formatData } from '../../utils/formatters';
import { queryKeys } from '../../utils/queryKeys';

const { Title, Text } = Typography;

interface ProgettoKPI {
  id: string; acronimo: string; titolo: string; tipo: string;
  data_inizio: string; data_fine: string;
  budget_previsto: number; budget_rendicontato: number;
  percentuale_budget: number; percentuale_tempo: number;
}
interface CruscottoData {
  progetti_attivi: number; timesheet_pendenti: number; sal_in_scadenza: number;
  spese_totali: number; budget_previsto: number; budget_rendicontato: number;
  percentuale_budget: number; progetti: ProgettoKPI[];
}

function colore(pct: number) {
  if (pct < 60) return '#52c41a';
  if (pct < 85) return '#faad14';
  return '#ff4d4f';
}

// ── KPI Card stile A ──────────────────────────────────────────────────────────
function GaugeCard({ label, value, pct, color, sub }: {
  label: string; value: string; pct: number; color: string; sub?: string;
}) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${color}`, borderRadius: 12,
      padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{label}</Text>
      <svg viewBox="0 0 130 130" width="140" height="140">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#D3D1C7" strokeWidth="13"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="13"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.6s' }}/>
        <text x="65" y="60" textAnchor="middle" fontSize="22" fontWeight="500" fill={color}>{value}</text>
        {sub && <text x="65" y="78" textAnchor="middle" fontSize="10" fill="#888">{sub}</text>}
      </svg>
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

  const tsPendenti = (tsData?.data ?? tsData ?? []).filter((t: { stato: string }) => t.stato === 'inviato').length ?? 0;
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
  const limiteSpese = progetto.budget_spese_ammissibili || progetto.importo_finanziato || progetto.budget_previsto;
  const pctSpese = limiteSpese > 0
    ? Math.round(speseDaUsare / limiteSpese * 1000) / 10
    : 0;

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
                € {((progetto.costo_totale || progetto.budget_previsto || 0) / 1000).toFixed(0)}k
              </strong>
            </Text>
            <Text style={{ fontSize: 15, color: '#888' }}>Importo finanziato:
              <strong style={{ fontSize: 17, color: '#185FA5', marginLeft: 8 }}>
                € {((progetto.importo_finanziato || 0) / 1000).toFixed(0)}k
              </strong>
            </Text>
            <Text style={{ fontSize: 15, color: '#888' }}>Cofinanziamento:
              <strong style={{ fontSize: 17, color: '#555', marginLeft: 8 }}>
                € {(((progetto.costo_totale || progetto.budget_previsto || 0) - (progetto.importo_finanziato || 0)) / 1000).toFixed(0)}k
              </strong>
            </Text>
          </div>
        </div>
        <Button type="primary" onClick={() => navigate(`/progetti/${progetto.id}`)}>
          Apri scheda progetto →
        </Button>
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

      {/* Riga 1: 3 gauge cerchi */}
      {(() => {
        const coloreBudget = '#185FA5';
        const coloreSpese = '#1D9E75';
        const coloreTempo = progetto.percentuale_tempo > 85 ? '#E24B4A' : '#BA7517';

        const dataInizio = progetto.data_inizio ? new Date(progetto.data_inizio) : null;
        const dataFine = progetto.data_fine ? new Date(progetto.data_fine) : null;
        const durataGg = dataInizio && dataFine ? Math.round((dataFine.getTime() - dataInizio.getTime()) / 86400000) : 0;
        const trascorsiGg = dataInizio ? Math.round((Date.now() - dataInizio.getTime()) / 86400000) : 0;

        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <GaugeCard
                label="Budget utilizzato"
                value={`${progetto.percentuale_budget}%`}
                pct={progetto.percentuale_budget}
                color={coloreBudget}
                sub={`€ ${(progetto.budget_rendicontato/1000).toFixed(0)}k / € ${(progetto.budget_previsto/1000).toFixed(0)}k`}
              />
            </Col>
            <Col span={8}>
              <GaugeCard
                label="Spese vs Contributo"
                value={`${pctSpese}%`}
                pct={pctSpese}
                color={coloreSpese}
                sub={`€ ${(speseDaUsare/1000).toFixed(1)}k / € ${(limiteSpese/1000).toFixed(1)}k`}
              />
            </Col>
            <Col span={8}>
              <GaugeCard
                label="Tempo trascorso"
                value={`${progetto.percentuale_tempo}%`}
                pct={progetto.percentuale_tempo}
                color={coloreTempo}
                sub={`${trascorsiGg}gg / ${durataGg}gg`}
              />
            </Col>
          </Row>
        );
      })()}

      {/* Riga 2: 3 KPI box */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <KpiBox label="Timesheet pendenti" value={tsPendenti}
            color={tsPendenti > 0 ? '#185FA5' : '#888'} />
        </Col>
        <Col span={8}>
          <KpiBox label="SAL in scadenza" value={salInScadenza}
            color={salInScadenza > 0 ? '#E24B4A' : '#888'} />
        </Col>
        <Col span={8}>
          <KpiBox label="Spese registrate" value={`€ ${(speseTotali/1000).toFixed(0)}k`}
            color="#185FA5" />
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

// ── Lista progetti ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const [progettoSelezionato, setProgettoSelezionato] = useState<ProgettoKPI | null>(null);

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
    spese_totali: 0, budget_previsto: 0, budget_rendicontato: 0, percentuale_budget: 0, progetti: [] };

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
                    </div>
                    <ProjectOutlined style={{ fontSize: 20, color: '#185FA5' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0 4px' }}>
                    <span style={{ fontSize: 12, color: '#888' }}>Costo progetto: <strong style={{ color: '#333' }}>€ {((p.costo_totale || p.budget_previsto || 0) / 1000).toFixed(0)}k</strong></span>
                    <span style={{ fontSize: 12, color: '#888' }}>Finanziato: <strong style={{ color: '#185FA5' }}>€ {((p.importo_finanziato || 0) / 1000).toFixed(0)}k</strong></span>
                  </div>

                  <Divider style={{ margin: '10px 0' }} />

                  <Row gutter={12}>
                    <Col span={12}>
                      <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                        Budget utilizzato
                      </Text>
                      <Text strong style={{ fontSize: 18, color: colore(p.percentuale_budget) }}>
                        {p.percentuale_budget}%
                      </Text>
                      <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 6 }}>
                        <div style={{ height: 4, width: `${Math.min(p.percentuale_budget,100)}%`,
                          background: colore(p.percentuale_budget), borderRadius: 2 }} />
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
