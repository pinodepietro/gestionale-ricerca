import { useQuery } from '@tanstack/react-query';
import { Table, Spin, Button, Row, Col, Typography, Tooltip } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { apiClient } from '../../../api/client';
import { env } from '../../../config/env';

const { Text } = Typography;

const EURO = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const fmt = (v: number | null | undefined) => (v == null || v === 0) ? '' : EURO.format(v);

interface MeseDato { impegnato: number; speso: number; disponibile: number; }
interface Item {
  tipo: string; descrizione: string; importo: number;
  col: 'impegnato' | 'speso'; mese_key: string; data: string;
}
interface PianoPersonale {
  label: string;
  per_mese_spe: number[];
  rendicontato: boolean[];
}
interface Voce {
  id: string; codice: string; descrizione: string;
  importo_previsto: number;
  per_mese: MeseDato[];
  items: Item[];
  piani_personale: PianoPersonale[] | null;
}
interface MeseInfo { key: string; label: string; anno: number; mese: number; }
interface AndamentoData { mesi: MeseInfo[]; voci: Voce[]; }

interface Props { progettoId: string; }

const BORDER = '1px solid #999';
const BORDER_STRONG = '2px solid #666';

const cellStyle: React.CSSProperties = {
  borderRight: BORDER,
  padding: '3px 6px',
  fontSize: 12,
  whiteSpace: 'nowrap',
};
const cellCenter: React.CSSProperties = { ...cellStyle, textAlign: 'right' };

export function TabAndamentoMensile({ progettoId }: Props) {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['andamento-mensile', progettoId],
    queryFn: () =>
      apiClient.get<AndamentoData>(`/progetti/${progettoId}/andamento-mensile`)
        .then(r => r.data),
    enabled: !!progettoId,
  });

  const downloadExcel = async () => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(
      `${env.apiUrl}/api/v1/progetti/${progettoId}/andamento-mensile/export/xlsx`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `andamento_mensile_${progettoId}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (isLoading) return <Spin style={{ display: 'block', marginTop: 40, textAlign: 'center' }} />;
  if (!raw || raw.mesi.length === 0)
    return <Text type="secondary">Nessun dato — verifica che il progetto abbia date di inizio e fine.</Text>;

  const { mesi, voci } = raw;
  const n = mesi.length;

  // Colonne fisse (sticky left)
  const fixedCols = [
    {
      title: 'Voce / Item',
      dataIndex: 'nome',
      key: 'nome',
      fixed: 'left' as const,
      width: 280,
      onCell: () => ({ style: { borderRight: BORDER_STRONG, padding: '3px 8px', whiteSpace: 'nowrap' as const } }),
      render: (_: unknown, r: Record<string, unknown>) => {
        if (r._tipo === 'totale') {
          return <Text strong style={{ fontSize: 13, whiteSpace: 'nowrap', color: '#ffffff' }}>TOTALE</Text>;
        }
        if (r._tipo === 'voce') {
          return <Text strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{r.codice as string} — {r.descrizione as string}</Text>;
        }
        if (r._tipo === 'piano') {
          const piano = r._piano as PianoPersonale;
          const isIniziale = piano.label.includes('iniziale');
          return (
            <Text style={{ fontSize: 12, color: isIniziale ? '#1d4ed8' : '#6d28d9', paddingLeft: 16 }}>
              ↳ {piano.label}
            </Text>
          );
        }
        const item = r._item as Item;
        return (
          <Tooltip title={`${item.data}`}>
            <Text style={{ fontSize: 12, color: '#555', paddingLeft: 16 }}>
              ◉ {item.descrizione}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Totale Previsto',
      dataIndex: 'previsto',
      key: 'previsto',
      fixed: 'left' as const,
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { borderRight: BORDER_STRONG, padding: '3px 8px', whiteSpace: 'nowrap' as const } }),
      render: (_: unknown, r: Record<string, unknown>) => {
        if (r._tipo !== 'voce' && r._tipo !== 'totale') return null;
        const isTotale = r._tipo === 'totale';
        return <Text strong style={{ fontSize: 12, whiteSpace: 'nowrap', color: isTotale ? '#ffffff' : undefined }}>{fmt(r.importo_previsto as number)}</Text>;
      },
    },
  ];

  // Colonne mensili con 3 sub-colonne
  const monthCols = mesi.map((m, idx) => ({
    title: (
      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, borderBottom: '1px solid #d9d9d9', paddingBottom: 2 }}>
        {m.label}
      </div>
    ),
    key: m.key,
    onHeaderCell: () => ({ style: { padding: 0, borderRight: BORDER_STRONG } }),
    children: [
      {
        title: <span style={{ fontSize: 10, color: '#92400e' }}>Imp.</span>,
        key: `${m.key}_imp`,
        width: 88,
        align: 'right' as const,
        onCell: () => ({ style: { ...cellStyle, backgroundColor: '#fffbf5', whiteSpace: 'nowrap' } }),
        render: (_: unknown, r: Record<string, unknown>) => {
          if (r._tipo === 'voce' || r._tipo === 'totale') {
            const pm = (r._per_mese as MeseDato[])[idx];
            return pm.impegnato ? <Text style={{ color: r._tipo === 'totale' ? '#fde68a' : '#b45309', fontWeight: 600, fontSize: 11 }}>{fmt(pm.impegnato)}</Text> : null;
          }
          return null;
        },
      },
      {
        title: <span style={{ fontSize: 10, color: '#9d174d' }}>Spe.</span>,
        key: `${m.key}_spe`,
        width: 88,
        align: 'right' as const,
        onCell: (_: unknown, r: Record<string, unknown>) => {
          if (r?._tipo === 'piano') {
            const piano = r._piano as PianoPersonale;
            const rend = piano.rendicontato[idx];
            return { style: { ...cellStyle, backgroundColor: rend ? '#d1fae5' : piano.label.includes('iniziale') ? '#eff6ff' : '#f5f3ff' } };
          }
          return { style: { ...cellStyle, backgroundColor: '#fff5f8' } };
        },
        render: (_: unknown, r: Record<string, unknown>) => {
          if (r._tipo === 'voce' || r._tipo === 'totale') {
            const pm = (r._per_mese as MeseDato[])[idx];
            return pm.speso ? <Text style={{ color: r._tipo === 'totale' ? '#fecdd3' : '#9d174d', fontWeight: 600, fontSize: 11 }}>{fmt(pm.speso)}</Text> : null;
          }
          if (r._tipo === 'piano') {
            const piano = r._piano as PianoPersonale;
            const v = piano.per_mese_spe[idx];
            const rend = piano.rendicontato[idx];
            return v ? (
              <Text style={{ fontSize: 11, fontWeight: rend ? 700 : 400, color: rend ? '#065f46' : '#374151' }}>
                {fmt(v)}
              </Text>
            ) : null;
          }
          if (r._tipo === 'item') {
            const item = r._item as Item;
            if (item.col === 'speso' && item.mese_key === m.key) {
              return <Text style={{ fontSize: 11, color: '#9d174d' }}>{fmt(item.importo)}</Text>;
            }
          }
          return null;
        },
      },
      {
        title: <span style={{ fontSize: 10, color: '#166534' }}>Dis.</span>,
        key: `${m.key}_dis`,
        width: 88,
        align: 'right' as const,
        onCell: () => ({ style: { ...cellCenter, borderRight: BORDER_STRONG, backgroundColor: '#f0fdf4', whiteSpace: 'nowrap' } }),
        render: (_: unknown, r: Record<string, unknown>) => {
          if (r._tipo !== 'voce' && r._tipo !== 'totale') return null;
          const pm = (r._per_mese as MeseDato[])[idx];
          const neg = pm.disponibile < 0;
          const isTotale = r._tipo === 'totale';
          return (
            <Text style={{ fontSize: 11, fontWeight: 700, color: isTotale ? (neg ? '#fca5a5' : '#86efac') : (neg ? '#dc2626' : '#15803d') }}>
              {fmt(pm.disponibile)}
            </Text>
          );
        },
      },
    ],
  }));

  const columns = [...fixedCols, ...monthCols];

  // Costruisce dataSource
  const dataSource: Record<string, unknown>[] = [];
  for (const voce of voci) {
    dataSource.push({
      key: voce.id,
      _tipo: 'voce',
      codice: voce.codice,
      descrizione: voce.descrizione,
      importo_previsto: voce.importo_previsto,
      _per_mese: voce.per_mese,
    });
    if (voce.piani_personale) {
      for (const piano of voce.piani_personale) {
        dataSource.push({
          key: `${voce.id}_${piano.label}`,
          _tipo: 'piano',
          _piano: piano,
        });
      }
    }
    for (const item of voce.items) {
      dataSource.push({
        key: `${voce.id}_${item.data}_${item.descrizione}`,
        _tipo: 'item',
        _item: item,
      });
    }
  }

  // Riga totali
  const totale_previsto = voci.reduce((sum, v) => sum + v.importo_previsto, 0);
  const totale_per_mese: MeseDato[] = mesi.map((_, idx) => ({
    impegnato: voci.reduce((sum, v) => sum + v.per_mese[idx].impegnato, 0),
    speso: voci.reduce((sum, v) => sum + v.per_mese[idx].speso, 0),
    disponibile: voci.reduce((sum, v) => sum + v.per_mese[idx].disponibile, 0),
  }));
  dataSource.push({
    key: '__totale__',
    _tipo: 'totale',
    importo_previsto: totale_previsto,
    _per_mese: totale_per_mese,
  });

  const scrollX = 280 + 130 + n * 3 * 88;

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Text style={{ color: '#b45309' }}>Imp.</Text> = impegnato &nbsp;·&nbsp;
            <Text style={{ color: '#9d174d' }}>Spe.</Text> = speso &nbsp;·&nbsp;
            <Text style={{ color: '#15803d' }}>Dis.</Text> = disponibile cumulativo &nbsp;·&nbsp;
            <Text style={{ color: '#065f46', fontWeight: 600 }}>Verde</Text> = dato reale da timesheet
          </Text>
        </Col>
        <Col>
          <Button icon={<FileExcelOutlined />} onClick={downloadExcel}>
            Esporta Excel
          </Button>
        </Col>
      </Row>

      <div style={{ overflowX: 'auto' }}>
        <Table
          bordered
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          scroll={{ x: scrollX }}
          rowClassName={(r: Record<string, unknown>) => {
            if (r._tipo === 'totale') return 'andamento-row-totale';
            if (r._tipo === 'voce') return 'andamento-row-voce';
            if (r._tipo === 'piano') return 'andamento-row-piano';
            return 'andamento-row-item';
          }}
          style={{ marginBottom: 16 }}
        />
      </div>
    </div>
  );
}
