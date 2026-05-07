// frontend/src/pages/progetti/tabs/TabBudget.tsx
// Mostra la tabella budget per voce di costo con badge colorati e drill-down sulle spese.
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

  const columns = [
    { title: 'Voce di costo', dataIndex: ['voce', 'descrizione'], ellipsis: true },
    {
      title: 'Previsto',
      dataIndex: 'importo_previsto',
      align: 'right' as const,
      render: formatEuro,
    },
    {
      title: 'Rendicontato',
      dataIndex: 'importo_rendicontato',
      align: 'right' as const,
      render: formatEuro,
    },
    {
      title: 'Residuo',
      dataIndex: 'importo_residuo',
      align: 'right' as const,
      render: (v: number) => <Text type={v < 0 ? 'danger' : undefined}>{formatEuro(v)}</Text>,
    },
    {
      title: '% Utilizzato',
      dataIndex: 'percentuale_utilizzata',
      width: 180,
      render: (pct: number) => (
        <Progress
          percent={Math.min(pct, 100)}
          size="small"
          strokeColor={coloreBudget(pct) === 'green' ? '#52c41a' : coloreBudget(pct) === 'orange' ? '#faad14' : '#ff4d4f'}
          format={() => formatPercentuale(pct)}
        />
      ),
    },
  ];

  const totAllocato = (data ?? []).reduce((s: number, r: BudgetVoce) => s + r.importo_previsto, 0);
  const costoTotale = progetto?.costo_totale ?? 0;
  const nonAllocato = costoTotale - totAllocato;

  return (
    <div>
      {nonAllocato > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16, borderColor: '#BA7517' }}
          message={
            <span>
              Budget non allocato per voce di costo:{' '}
              <strong>{formatEuro(nonAllocato)}</strong>
              {' '}(costo totale progetto: {formatEuro(costoTotale)}, allocato: {formatEuro(totAllocato)})
            </span>
          }
        />
      )}
      <Table
      columns={columns}
      dataSource={data ?? []}
      rowKey="id"
      loading={isLoading}
      pagination={false}
      summary={(rows) => {
        const totPrevisto = rows.reduce((s, r) => s + (r as BudgetVoce).importo_previsto, 0);
        const totRendicontato = rows.reduce((s, r) => s + (r as BudgetVoce).importo_rendicontato, 0);
        return (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><Text strong>Totale</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><Text strong>{formatEuro(totPrevisto)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><Text strong>{formatEuro(totRendicontato)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <Text strong type={totPrevisto - totRendicontato < 0 ? 'danger' : undefined}>
                {formatEuro(totPrevisto - totRendicontato)}
              </Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} />
          </Table.Summary.Row>
        );
      }}
    />
    </div>
  );
}
