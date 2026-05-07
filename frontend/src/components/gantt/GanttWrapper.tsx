// frontend/src/components/gantt/GanttWrapper.tsx
import { useMemo } from 'react';
import type { WorkPackage, Milestone } from '../../types/struttura';

const PALETTE = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
  '#9B59B6', '#1ABC9C', '#E67E22', '#2980B9',
  '#E91E63', '#00BCD4', '#FF5722', '#8BC34A',
];

interface Props {
  workPackages: WorkPackage[];
  milestone: Milestone[];
  viewMode?: string;
  dataInizioProgetto?: string;
  dataFineProgetto?: string;
}

const ROW_H = 40;
const LABEL_W = 200;
const HEADER_H = 50;
const BAR_H = 22;
const BAR_RADIUS = 4;

function parseDate(s: string) { return new Date(s.substring(0, 10)); }
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function formatMonth(d: Date) {
  return d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
}

export function GanttWrapper({ workPackages, milestone, dataInizioProgetto, dataFineProgetto, viewMode = 'Month' }: Props) {

  const dati = useMemo(() => {
    if (workPackages.length === 0) return null;

    const tutte = [
      ...workPackages.map(wp => ({ inizio: parseDate(wp.data_inizio), fine: parseDate(wp.data_fine) })),
      ...milestone.map(ms => {
        const d = parseDate(ms.data_effettiva ?? ms.data_prevista);
        return { inizio: d, fine: d };
      }),
    ];

    const datesMin = tutte.map(t => t.inizio.getTime());
    const datesMax = tutte.map(t => t.fine.getTime());

    if (dataInizioProgetto) datesMin.push(parseDate(dataInizioProgetto).getTime());
    if (dataFineProgetto) datesMax.push(parseDate(dataFineProgetto).getTime());

    const minDate = new Date(Math.min(...datesMin));
    const maxDate = new Date(Math.max(...datesMax));

    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    const totalDays = daysBetween(minDate, maxDate);

    const mesi: { label: string; x: number; w: number }[] = [];
    if (viewMode === 'Week') {
      const cur = new Date(minDate);
      cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
      while (cur <= maxDate) {
        const xStart = Math.max(0, daysBetween(minDate, cur));
        const nextWeek = new Date(cur);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const xEnd = Math.min(totalDays, daysBetween(minDate, nextWeek));
        if (xEnd > xStart) {
          const label = cur.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
          mesi.push({ label, x: xStart, w: xEnd - xStart });
        }
        cur.setDate(cur.getDate() + 7);
      }
    } else {
      const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      while (cur <= maxDate) {
        const xStart = Math.max(0, daysBetween(minDate, cur));
        const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        const xEnd = Math.min(totalDays, daysBetween(minDate, nextMonth));
        mesi.push({ label: formatMonth(cur), x: xStart, w: xEnd - xStart });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    return { minDate, totalDays, mesi };
  }, [workPackages, milestone, dataInizioProgetto, dataFineProgetto, viewMode]);

  if (!dati || workPackages.length === 0) {
    return <p style={{ color: '#999' }}>Nessun Work Package definito.</p>;
  }

  const PX_PER_DAY = viewMode === 'Week' ? 36 : 18;
  const { minDate, totalDays, mesi } = dati;
  const svgW = totalDays * PX_PER_DAY;
  const today = new Date();
  const todayX = daysBetween(minDate, today) * PX_PER_DAY;

  const inizioProgettoX = dataInizioProgetto
    ? daysBetween(minDate, parseDate(dataInizioProgetto)) * PX_PER_DAY : null;
  const fineProgettoX = dataFineProgetto
    ? daysBetween(minDate, parseDate(dataFineProgetto)) * PX_PER_DAY : null;

  const allItems = [
    ...workPackages.map((wp, i) => ({
      type: 'wp' as const, id: wp.id, codice: wp.codice, titolo: wp.titolo,
      color: PALETTE[i % PALETTE.length], stato: wp.stato,
      inizio: parseDate(wp.data_inizio), fine: parseDate(wp.data_fine),
    })),
    ...milestone.map(ms => ({
      type: 'ms' as const, id: ms.id, codice: ms.codice, titolo: ms.titolo,
      color: '#F39C12', stato: ms.stato,
      inizio: parseDate(ms.data_effettiva ?? ms.data_prevista),
      fine: parseDate(ms.data_effettiva ?? ms.data_prevista),
    })),
  ];

  const totalH = HEADER_H + allItems.length * ROW_H;

  return (
    <div style={{ display: 'flex', border: '1px solid #e8e8e8', borderRadius: 8,
      overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>

      {/* Colonna nomi */}
      <div style={{ flexShrink: 0, width: LABEL_W, borderRight: '2px solid #e0e0e0' }}>
        <div style={{ height: HEADER_H, background: '#f5f5f5', borderBottom: '2px solid #e0e0e0',
          display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Attività</span>
        </div>
        {allItems.map((item, i) => (
          <div key={item.id} style={{
            height: ROW_H, display: 'flex', alignItems: 'center',
            paddingLeft: 8, paddingRight: 6,
            borderBottom: '1px solid #f0f0f0',
            borderLeft: `4px solid ${item.color}`,
            background: i % 2 === 0 ? '#fff' : '#fafafa',
            boxSizing: 'border-box',
          }}>
            <div style={{ overflow: 'hidden', width: '100%' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333', lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.codice}
              </div>
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.titolo}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Area Gantt scrollabile */}
      <div style={{ flex: 1, overflowX: 'auto' }}>
        <svg width={svgW} height={totalH} style={{ display: 'block' }}>

          {/* Sfondo righe */}
          {allItems.map((_, i) => (
            <rect key={i} x={0} y={HEADER_H + i * ROW_H} width={svgW} height={ROW_H}
              fill={i % 2 === 0 ? '#ffffff' : '#fafafa'} />
          ))}

          {/* Griglia verticale mensile */}
          {mesi.map((m, i) => (
            <line key={i} x1={m.x * PX_PER_DAY} y1={0} x2={m.x * PX_PER_DAY} y2={totalH}
              stroke="#e8e8e8" strokeWidth={1} />
          ))}

          {/* Header mesi */}
          <rect x={0} y={0} width={svgW} height={HEADER_H} fill="#f5f5f5" />
          {mesi.map((m, i) => (
            <text key={i} x={m.x * PX_PER_DAY + 8} y={HEADER_H / 2 + 5}
              fontSize={11} fontWeight={600} fill="#555">
              {m.label}
            </text>
          ))}
          <line x1={0} y1={HEADER_H} x2={svgW} y2={HEADER_H} stroke="#e0e0e0" strokeWidth={2} />

          {/* Separatori righe */}
          {allItems.map((_, i) => (
            <line key={i} x1={0} y1={HEADER_H + (i + 1) * ROW_H}
              x2={svgW} y2={HEADER_H + (i + 1) * ROW_H}
              stroke="#f0f0f0" strokeWidth={1} />
          ))}

          {/* Barre WP e milestone */}
          {allItems.map((item, i) => {
            const y = HEADER_H + i * ROW_H;
            const barY = y + (ROW_H - BAR_H) / 2;

            if (item.type === 'ms') {
              const cx = daysBetween(minDate, item.inizio) * PX_PER_DAY;
              const cy = y + ROW_H / 2;
              const s = 10;
              return (
                <g key={item.id}>
                  <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                    fill={item.color} stroke="#fff" strokeWidth={1.5} />
                  <title>{item.codice}: {item.titolo}</title>
                </g>
              );
            }

            const x = daysBetween(minDate, item.inizio) * PX_PER_DAY;
            const w = Math.max(daysBetween(item.inizio, item.fine) * PX_PER_DAY, 4);
            const progress = item.stato === 'completato' ? 1 : item.stato === 'in_corso' ? 0.5 : 0;

            return (
              <g key={item.id}>
                <rect x={x} y={barY} width={w} height={BAR_H}
                  rx={BAR_RADIUS} fill={item.color} opacity={0.25} />
                {progress > 0 && (
                  <rect x={x} y={barY} width={w * progress} height={BAR_H}
                    rx={BAR_RADIUS} fill={item.color} />
                )}
                <rect x={x} y={barY} width={w} height={BAR_H}
                  rx={BAR_RADIUS} fill="none" stroke={item.color} strokeWidth={1.5} />
                <title>{item.codice} — {item.titolo}</title>
              </g>
            );
          })}

          {/* Linea inizio progetto */}
          {inizioProgettoX !== null && inizioProgettoX >= 0 && inizioProgettoX <= svgW && (
            <g>
              <line x1={inizioProgettoX} y1={0} x2={inizioProgettoX} y2={totalH}
                stroke="#185FA5" strokeWidth={2} strokeDasharray="6,3" />
              <rect x={inizioProgettoX + 2} y={4} width={42} height={16} rx={3} fill="#185FA5" />
              <text x={inizioProgettoX + 23} y={16} textAnchor="middle"
                fontSize={10} fill="#fff" fontWeight={600}>inizio</text>
            </g>
          )}

          {/* Linea fine progetto */}
          {fineProgettoX !== null && fineProgettoX >= 0 && fineProgettoX <= svgW && (
            <g>
              <line x1={fineProgettoX} y1={0} x2={fineProgettoX} y2={totalH}
                stroke="#9B59B6" strokeWidth={2} strokeDasharray="6,3" />
              <rect x={fineProgettoX - 32} y={4} width={30} height={16} rx={3} fill="#9B59B6" />
              <text x={fineProgettoX - 17} y={16} textAnchor="middle"
                fontSize={10} fill="#fff" fontWeight={600}>fine</text>
            </g>
          )}

          {/* Linea oggi */}
          {todayX >= 0 && todayX <= svgW && (
            <g>
              <line x1={todayX} y1={0} x2={todayX} y2={totalH}
                stroke="#E74C3C" strokeWidth={1.5} strokeDasharray="4,3" />
              <rect x={todayX - 16} y={4} width={32} height={16} rx={3} fill="#E74C3C" />
              <text x={todayX} y={16} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>
                oggi
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
