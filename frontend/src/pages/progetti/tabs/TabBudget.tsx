import { useQuery } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { queryKeys } from '../../../utils/queryKeys';
import { Table, Progress, Typography, Alert } from 'antd';
import { budgetApi } from '../../../api/budget';
import { formatEuro, formatPercentuale, coloreBudget } from '../../../utils/formatters';
import type { BudgetVoce } from '../../../types/budget';

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

  const totAllocato = (data ?? []).reduce((s: number, r: BudgetVoce) => s + r.importo_previsto, 0);
  const costoTotale = progetto?.costo_totale ?? 0;
  const nonAllocato = costoTotale - totAllocato;

  const columns = [
    { title: 'Voce di costo', dataIndex: ['voce', 'descrizione'], ellipsis: true },
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

      <Table columns={columns} dataSource={data ?? []} rowKey="id" loading={isLoading}
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
              <Table.Summary.Cell index={0}><Text strong>Totale</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><Text strong>{formatEuro(totPrevisto)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><Text strong>{formatEuro(totErogato)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><Text strong>{formatEuro(totImpegnato)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><Text strong>{formatEuro(totSpeso)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><Text strong>{formatEuro(totRendicontato)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <Text strong type={totDisponibile < 0 ? 'danger' : undefined}>
                  {formatEuro(totDisponibile)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} />
            </Table.Summary.Row>
          );
        }}
      />

    </div>
  );
}
