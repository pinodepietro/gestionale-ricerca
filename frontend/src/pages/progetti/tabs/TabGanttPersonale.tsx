import { useState, useMemo } from 'react';
import { Table, Typography, Select, Statistic, Row, Col, Tag, Tooltip, Spin, Button } from 'antd';
import { CheckCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { env } from '../../../config/env';

const { Text } = Typography;

const fmtEuro = (v: number | null): string => {
  if (v === null) return '—';
  const parts = v.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',') + ' €';
};

const fmtOre = (v: number | null): string =>
  v === null ? '—' : `${v.toFixed(1)} h`;

interface MesePersona { label: string; ore: number | null; costo: number | null; rendicontato: boolean; }
interface Persona {
  persona_id: string; nome: string; cognome: string;
  tariffa_corrente: number; ore_assegnate: number;
  alloc_inizio: string; alloc_fine: string;
  mesi: MesePersona[];
  totale_ore: number; totale_costo: number;
}
interface GanttData {
  mesi: { label: string; anno: number; mese: number }[];
  num_mesi: number;
  pianificazione_iniziale: { importo_previsto: number; per_mese: number; mesi: { label: string; costo: number }[] };
  pianificazione_corrente: { mesi: { label: string; costo: number; rendicontato: boolean }[]; totale: number };
  persone: Persona[];
  totali_mese: number[];
  totale_complessivo: number;
}

interface Props { progettoId: string; }

export function TabGanttPersonale({ progettoId }: Props) {
  const [periodoInizio, setPeriodoInizio] = useState<string | null>(null);
  const [periodoFine, setPeriodoFine] = useState<string | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['gantt-personale', progettoId],
    queryFn: () => apiClient.get<{ data: GanttData }>(`/progetti/${progettoId}/gantt-personale`).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const downloadExcel = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${env.apiUrl}/api/v1/progetti/${progettoId}/gantt-personale/export/xlsx`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gantt_personale_${progettoId}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalePeriodo = useMemo(() => {
    if (!raw || !periodoInizio || !periodoFine) return null;
    const idxStart = raw.mesi.findIndex(m => m.label === periodoInizio);
    const idxEnd = raw.mesi.findIndex(m => m.label === periodoFine);
    if (idxStart < 0 || idxEnd < 0 || idxStart > idxEnd) return null;
    return raw.totali_mese.slice(idxStart, idxEnd + 1).reduce((s, v) => s + v, 0);
  }, [raw, periodoInizio, periodoFine]);

  if (isLoading) return <Spin style={{ display: 'block', marginTop: 40, textAlign: 'center' }} />;
  if (!raw) return null;

  const opzioniMesi = raw.mesi.map(m => ({ value: m.label, label: `${m.label} (${m.mese}/${m.anno})` }));

  // Colonne fisse
  const colFixedLeft = [
    {
      title: 'Persona',
      dataIndex: 'nome',
      key: 'persona',
      fixed: 'left' as const,
      width: 200,
      render: (_: unknown, r: Record<string, unknown>) => {
        if (r._tipo === 'pianificazione_iniziale') return <Text strong style={{ color: '#1677ff' }}>Pianificazione Iniziale</Text>;
        if (r._tipo === 'pianificazione_corrente') return <Text strong style={{ color: '#722ed1' }}>Pianificazione Corrente</Text>;
        if (r._tipo === 'totale') return <Text strong>TOTALE COSTO MESE</Text>;
        return (
          <div>
            <Text strong>{r.cognome as string} {r.nome as string}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.tariffa_corrente ? `${(r.tariffa_corrente as number).toFixed(2)} €/h` : '—'}
              {' · '}
              {r.alloc_inizio ? (r.alloc_inizio as string).substring(0, 7) : ''} → {r.alloc_fine ? (r.alloc_fine as string).substring(0, 7) : ''}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Totale',
      key: 'totale',
      fixed: 'left' as const,
      width: 110,
      align: 'right' as const,
      render: (_: unknown, r: Record<string, unknown>) => {
        if (r._tipo === 'pianificazione_iniziale') return <Text strong style={{ color: '#1677ff' }}>{fmtEuro(raw.pianificazione_iniziale.importo_previsto)}</Text>;
        if (r._tipo === 'pianificazione_corrente') return <Text strong style={{ color: '#722ed1' }}>{fmtEuro(raw.pianificazione_corrente.totale)}</Text>;
        if (r._tipo === 'totale') return <Text strong>{fmtEuro(raw.totale_complessivo)}</Text>;
        const p = r as unknown as Persona;
        return (
          <div>
            <Text strong>{fmtEuro(p.totale_costo)}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>{fmtOre(p.totale_ore)}</Text>
          </div>
        );
      },
    },
  ];

  // Colonne mesi (dinamiche)
  const colMesi = raw.mesi.map((m, idx) => ({
    title: (
      <div style={{ textAlign: 'center', fontSize: 12 }}>
        <div>{m.label}</div>
        <div style={{ color: '#999', fontSize: 10 }}>{m.mese}/{m.anno}</div>
      </div>
    ),
    key: m.label,
    width: 90,
    align: 'center' as const,
    render: (_: unknown, r: Record<string, unknown>) => {
      if (r._tipo === 'pianificazione_iniziale') {
        return <Text style={{ color: '#1677ff', fontSize: 12 }}>{fmtEuro(raw.pianificazione_iniziale.per_mese)}</Text>;
      }
      if (r._tipo === 'pianificazione_corrente') {
        const mc = raw.pianificazione_corrente.mesi[idx];
        return (
          <Text style={{ color: mc.rendicontato ? '#52c41a' : '#722ed1', fontSize: 12, fontWeight: mc.rendicontato ? 700 : 400 }}>
            {mc.rendicontato && <CheckCircleOutlined style={{ marginRight: 2 }} />}
            {fmtEuro(mc.costo)}
          </Text>
        );
      }
      if (r._tipo === 'totale') {
        return <Text strong style={{ fontSize: 12 }}>{fmtEuro(raw.totali_mese[idx])}</Text>;
      }
      const p = r as unknown as Persona;
      const meseData = p.mesi[idx];
      if (!meseData || meseData.ore === null) return <Text type="secondary">—</Text>;
      return (
        <Tooltip title={meseData.rendicontato ? 'Dato reale da timesheet rendicontato' : 'Pianificato'}>
          <div style={{
            background: meseData.rendicontato ? '#f6ffed' : undefined,
            borderRadius: 4, padding: '2px 4px',
          }}>
            {meseData.rendicontato && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 10, marginRight: 2 }} />}
            <Text style={{ fontSize: 12 }}>{fmtEuro(meseData.costo)}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 10 }}>{fmtOre(meseData.ore)}</Text>
          </div>
        </Tooltip>
      );
    },
  }));

  const columns = [...colFixedLeft, ...colMesi];

  // Righe tabella
  const rigaPianIniziale = { _tipo: 'pianificazione_iniziale', key: '__pian_iniz__' };
  const rigaPianCorrente = { _tipo: 'pianificazione_corrente', key: '__pian_corr__' };
  const righePersone = raw.persone.map(p => ({ ...p, _tipo: 'persona', key: p.persona_id }));
  const rigaTotale = { _tipo: 'totale', key: '__tot__' };
  const dataSource = [rigaPianIniziale, rigaPianCorrente, ...righePersone, rigaTotale];

  return (
    <div>
      {/* Legenda */}
      <Row gutter={16} justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Row gutter={16}>
            <Col>
              <Tag icon={<CheckCircleOutlined />} color="success">Rendicontato (timesheet approvato)</Tag>
            </Col>
            <Col>
              <Tag color="default">Pianificato</Tag>
            </Col>
            <Col>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Prima riga: budget voce A.1 spalmato uniformemente · Celle persona: ore uniformi nel periodo di allocazione
              </Text>
            </Col>
          </Row>
        </Col>
        <Col>
          <Button icon={<FileExcelOutlined />} onClick={downloadExcel}>
            Esporta Excel
          </Button>
        </Col>
      </Row>

      {/* Tabella Gantt */}
      <div style={{ overflowX: 'auto' }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          scroll={{ x: 200 + 110 + raw.num_mesi * 90 }}
          rowClassName={(r: Record<string, unknown>) => {
            if (r._tipo === 'pianificazione_iniziale') return 'gantt-row-pian';
            if (r._tipo === 'pianificazione_corrente') return 'gantt-row-corrente';
            if (r._tipo === 'totale') return 'gantt-row-totale';
            return '';
          }}
          style={{ marginBottom: 24 }}
        />
      </div>

      {/* Selettore periodo */}
      <div style={{ background: '#fafafa', padding: '16px 20px', borderRadius: 8, display: 'inline-flex', gap: 16, alignItems: 'center' }}>
        <Text strong>Costo personale nel periodo:</Text>
        <Select
          style={{ width: 160 }}
          placeholder="Mese inizio"
          options={opzioniMesi}
          value={periodoInizio}
          onChange={v => { setPeriodoInizio(v); if (periodoFine && v > periodoFine) setPeriodoFine(null); }}
          allowClear
        />
        <Text>→</Text>
        <Select
          style={{ width: 160 }}
          placeholder="Mese fine"
          options={opzioniMesi.filter(o => !periodoInizio || o.value >= periodoInizio)}
          value={periodoFine}
          onChange={setPeriodoFine}
          allowClear
        />
        {totalePeriodo !== null && (
          <Statistic
            value={fmtEuro(totalePeriodo)}
            valueStyle={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}
          />
        )}
      </div>
    </div>
  );
}
