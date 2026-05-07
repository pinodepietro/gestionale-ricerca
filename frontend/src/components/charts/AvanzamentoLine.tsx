// frontend/src/components/charts/AvanzamentoLine.tsx
// Grafico a linee: speso vs previsto nel tempo (per SAL).
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatEuro } from '../../utils/formatters';

interface DataPoint {
  label: string;       // es. "SAL 1", "SAL 2", ...
  previsto: number;
  rendicontato: number;
}

interface Props {
  data: DataPoint[];
}

export function AvanzamentoLine({ data }: Props) {
  if (data.length === 0) {
    return <p style={{ color: '#999', textAlign: 'center' }}>Nessun dato disponibile.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
        <Tooltip formatter={(value: number) => formatEuro(value)} />
        <Legend />
        <Line
          type="monotone"
          dataKey="previsto"
          name="Budget previsto"
          stroke="#185FA5"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="rendicontato"
          name="Speso rendicontato"
          stroke="#52c41a"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
