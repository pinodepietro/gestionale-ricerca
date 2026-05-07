// frontend/src/components/common/ImportoBudget.tsx
// Cella budget con barra di avanzamento colorata in base alla % utilizzata.
import { Progress, Tooltip } from 'antd';
import { formatEuro, formatPercentuale, coloreBudget } from '../../utils/formatters';

interface Props {
  importoPrevisto: number;
  importoRendicontato: number;
}

const STROKE: Record<'green' | 'orange' | 'red', string> = {
  green: '#52c41a',
  orange: '#faad14',
  red: '#ff4d4f',
};

export function ImportoBudget({ importoPrevisto, importoRendicontato }: Props) {
  const pct = importoPrevisto > 0
    ? (importoRendicontato / importoPrevisto) * 100
    : 0;
  const colore = coloreBudget(pct);

  return (
    <Tooltip title={`${formatEuro(importoRendicontato)} di ${formatEuro(importoPrevisto)}`}>
      <div style={{ minWidth: 120 }}>
        <Progress
          percent={Math.min(pct, 100)}
          size="small"
          strokeColor={STROKE[colore]}
          format={() => formatPercentuale(pct)}
        />
      </div>
    </Tooltip>
  );
}
