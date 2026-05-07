// frontend/src/components/charts/BudgetDonut.tsx
// Grafico a ciambella: distribuzione del budget rendicontato per voce di costo.
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatEuro } from '../../utils/formatters';
import type { BudgetVoce } from '../../types/budget';

interface Props {
  voci: BudgetVoce[];
}

// Palette colori coerente con il tema blu primario
const COLORI = ['#185FA5', '#2e86de', '#54a0ff', '#74b9ff', '#a29bfe', '#6c5ce7', '#00b894', '#00cec9'];

export function BudgetDonut({ voci }: Props) {
  const data = voci
    .filter((v) => v.importo_rendicontato > 0)
    .map((v, i) => ({
      name: v.importo_previsto > 0 ? `Voce ${i + 1}` : 'Altra voce', // idealmente passi descrizione
      value: v.importo_rendicontato,
      fill: COLORI[i % COLORI.length],
    }));

  if (data.length === 0) {
    return <p style={{ color: '#999', textAlign: 'center' }}>Nessuna spesa rendicontata.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatEuro(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
