import { useQuery } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { queryKeys } from '../../../utils/queryKeys';
import { Table, Progress, Typography, Alert, Tag, Tooltip } from 'antd';
import { budgetApi } from '../../../api/budget';
import { formatEuro, formatPercentuale, coloreBudget } from '../../../utils/formatters';
import type { BudgetVoce } from '../../../types/budget';
import type { WorkPackage } from '../../../types/struttura';

const { Text } = Typography;

export function TabBudget({ progettoId }: { progettoId: string }) {
  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId),
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.progetti.budget(progettoId),
    queryFn: () => budgetApi.voci.list(progettoId).then((r) => r.data.data),
  });

  const { data: wps } = useQuery({
    queryKey: ['wp', progettoId],
    queryFn: () => progettiApi.wp.list(progettoId).then(r => r.data.data as WorkPackage[]),
    enabled: !!progetto?.gestione_per_wp,
  });

  const gestionePerWp: boolean = progetto?.gestione_per_wp ?? false;

  // In WP mode mostra solo le righe WP (wp_id != null) per evitare doppia somma
  const vociDaMostrare = gestionePerWp
    ? (data ?? []).filter((bv: BudgetVoce) => bv.wp_id !== null)
    : (data ?? []);

  const costoTotale = progetto?.costo_totale ?? 0;
  // Avviso "non allocato" basato sulle righe di progetto (wp_id=null)
  const vociProgetto = (data ?? []).filter((bv: BudgetVoce) => bv.wp_id === null);
  const totAllocato = vociProgetto.reduce((s: number, r: BudgetVoce) => s + r.importo_previsto, 0);
  const nonAllocato = !gestionePerWp ? costoTotale - totAllocato : 0;

  const wpNome = (wpId: string | null | undefined) => {
    if (!wpId) return null;
    const wp = wps?.find(w => w.id === wpId);
    return wp ? `${wp.codice} — ${wp.titolo}` : wpId;
  };

  const columns = [
    ...(gestionePerWp ? [{
      title: 'WP', dataIndex: 'wp_id', width: 160,
      render: (id: string | null) => id
        ? <Tooltip title={wpNome(id)} overlayStyle={{ maxWidth: 400 }}>
            <Tag color="blue" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100%' }}>
              {wpNome(id)}
            </Tag>
          </Tooltip>
        : <Text type="secondary">—</Text>,
    }] : []),
    { title: 'Voce di costo', dataIndex: ['voce', 'descrizione'], ellipsis: true, width: 250 },
    { title: 'Previsto', dataIndex: 'importo_previsto', align: 'right' as const, width: 130, render: formatEuro },
    { title: 'Erogato', dataIndex: 'importo_erogato', align: 'right' as const, width: 120,
      render: (v: number) => <Text type={v > 0 ? 'success' : undefined}>{formatEuro(v)}</Text>,
    },
    {
      title: 'Impegnato', dataIndex: 'importo_impegnato', align: 'right' as const, width: 120,
      render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{formatEuro(v)}</Text>,
    },
    {
      title: 'Speso', dataIndex: 'importo_speso', align: 'right' as const, width: 120,
      render: (v: number) => formatEuro(v),
    },
    { title: 'Rendicontato', dataIndex: 'importo_rendicontato', align: 'right' as const, width: 130, render: formatEuro },
    {
      title: 'Disponibile', dataIndex: 'importo_disponibile', align: 'right' as const, width: 120,
      render: (v: number) => <Text type={v < 0 ? 'danger' : undefined}>{formatEuro(v)}</Text>,
    },
    {
      title: '% Utilizzato', dataIndex: 'percentuale_utilizzata', width: 160,
      render: (pct: number) => (
        <Progress
          percent={Math.min(pct, 100)} size="small"
          strokeColor={coloreBudget(pct) === 'green' ? '#52c41a' : coloreBudget(pct) === 'orange' ? '#faad14' : '#ff4d4f'}
          format={() => formatPercentuale(pct)}
        />
      ),
    },
  ];

  const colOffset = gestionePerWp ? 1 : 0;

  return (
    <div>
      {nonAllocato > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 16, borderColor: '#BA7517' }}
          message={
            <span>
              Budget non allocato per voce di costo: <strong>{formatEuro(nonAllocato)}</strong>
              {' '}(costo totale: {formatEuro(costoTotale)}, allocato: {formatEuro(totAllocato)})
            </span>
          }
        />
      )}

      <Table columns={columns} dataSource={vociDaMostrare} rowKey="id" loading={isLoading}
        pagination={false}
        summary={(rows) => {
          const totPrevisto = rows.reduce((s, r) => s + (r as BudgetVoce).importo_previsto, 0);
          const totErogato = rows.reduce((s, r) => s + ((r as BudgetVoce).importo_erogato ?? 0), 0);
          const totImpegnato = rows.reduce((s, r) => s + ((r as BudgetVoce).importo_impegnato ?? 0), 0);
          const totSpeso = rows.reduce((s, r) => s + ((r as BudgetVoce).importo_speso ?? 0), 0);
          const totRendicontato = rows.reduce((s, r) => s + (r as BudgetVoce).importo_rendicontato, 0);
          const totDisponibile = totErogato - totImpegnato - totSpeso;
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={1 + colOffset}><Text strong>Totale</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={1 + colOffset} align="right"><Text strong>{formatEuro(totPrevisto)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={2 + colOffset} align="right"><Text strong>{formatEuro(totErogato)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={3 + colOffset} align="right"><Text strong>{formatEuro(totImpegnato)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={4 + colOffset} align="right"><Text strong>{formatEuro(totSpeso)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={5 + colOffset} align="right"><Text strong>{formatEuro(totRendicontato)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={6 + colOffset} align="right">
                <Text strong type={totDisponibile < 0 ? 'danger' : undefined}>
                  {formatEuro(totDisponibile)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7 + colOffset} />
            </Table.Summary.Row>
          );
        }}
      />
    </div>
  );
}
