// frontend/src/pages/progetti/tabs/TabPersonale.tsx
import { Table, Tag, Typography, Space, Progress } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { progettiApi } from '../../../api/progetti';
import { personaleApi } from '../../../api/personale';
import { timesheetApi } from '../../../api/timesheet';
import { queryKeys } from '../../../utils/queryKeys';
import { formatData, formatOre } from '../../../utils/formatters';

const { Text } = Typography;

interface Allocazione {
  id: string;
  persona_id: string;
  ore_assegnate: number;
  data_inizio: string;
  data_fine: string;
  note?: string;
  is_pi?: boolean;
  is_ammin?: boolean;
}

interface Props { progettoId: string; }

export function TabPersonale({ progettoId }: Props) {
  const navigate = useNavigate();

  const { data: allocazioni, isLoading } = useQuery({
    queryKey: queryKeys.progetti.allocazioni(progettoId),
    queryFn: () => progettiApi.allocazioni.list(progettoId).then(r => r.data.data as Allocazione[]),
    enabled: !!progettoId,
  });

  const { data: persone } = useQuery({
    queryKey: queryKeys.personale.list({ attivo: true }),
    queryFn: () => personaleApi.list({}).then(r => r.data.data),
  });

  const { data: timesheetData } = useQuery({
    queryKey: queryKeys.timesheet.list({ progetto_id: progettoId }),
    queryFn: () => timesheetApi.list({ progetto_id: progettoId }).then(r => r.data),
    enabled: !!progettoId,
  });
  const timesheet = timesheetData?.data ?? [];

  const nomPersona = (id: string) => {
    const p = persone?.find((x: { id: string }) => x.id === id);
    return p ? `${p.nome} ${p.cognome}` : '—';
  };

  const ruoloPersona = (id: string) => {
    const p = persone?.find((x: { id: string }) => x.id === id);
    return p?.ruolo_ente || '—';
  };

  // Calcola ore effettive dai timesheet approvati per persona
  const oreEffettivePerPersona = (personaId: string): number => {
    return timesheet
      .filter((ts: { persona_id: string; stato: string }) =>
        ts.persona_id === personaId && ts.stato === 'approvato')
      .reduce((sum: number, ts: { ore_totali_progetto?: number }) =>
        sum + (ts.ore_totali_progetto ?? 0), 0);
  };

  const isAttivo = (dataInizio: string, dataFine: string) => {
    const oggi = new Date();
    return new Date(dataInizio) <= oggi && new Date(dataFine) >= oggi;
  };

  const colonne = [
    {
      title: 'Persona', key: 'persona',
      render: (_: unknown, r: Allocazione) => (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            <Text strong style={{ cursor: 'pointer', color: '#185FA5' }}
              onClick={() => navigate(`/personale/${r.persona_id}`)}>
              {nomPersona(r.persona_id)}
            </Text>
            {r.is_pi && <Tag color="blue" style={{ fontSize: 11, padding: '0 4px' }}>PI</Tag>}
            {r.is_ammin && <Tag color="orange" style={{ fontSize: 11, padding: '0 4px' }}>Ammin</Tag>}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>{ruoloPersona(r.persona_id)}</Text>
        </Space>
      ),
    },
    {
      title: 'Periodo', key: 'periodo', width: 230,
      render: (_: unknown, r: Allocazione) => (
        <Space>
          <Text style={{ fontSize: 12 }}>{formatData(r.data_inizio)} → {formatData(r.data_fine)}</Text>
          {isAttivo(r.data_inizio, r.data_fine)
            ? <Tag color="green">Attivo</Tag>
            : <Tag>Concluso</Tag>}
        </Space>
      ),
    },
    {
      title: 'Ore assegnate', dataIndex: 'ore_assegnate', width: 130,
      render: (v: number) => <Text strong>{formatOre(v)}</Text>,
    },
    {
      title: 'Ore rendicontate', key: 'ore_effettive', width: 150,
      render: (_: unknown, r: Allocazione) => {
        const effettive = oreEffettivePerPersona(r.persona_id);
        return <Text style={{ color: '#185FA5' }}>{formatOre(effettive)}</Text>;
      },
    },
    {
      title: 'Avanzamento', key: 'avanzamento', width: 180,
      render: (_: unknown, r: Allocazione) => {
        const effettive = oreEffettivePerPersona(r.persona_id);
        const pct = r.ore_assegnate > 0
          ? Math.round(effettive / r.ore_assegnate * 100) : 0;
        return (
          <Progress
            percent={Math.min(pct, 100)}
            size="small"
            status={pct > 100 ? 'exception' : pct === 100 ? 'success' : 'active'}
            format={() => `${pct}%`}
          />
        );
      },
    },
    {
      title: 'Note', dataIndex: 'note', ellipsis: true,
      render: (v: string) => v || '—',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Personale allocato sul progetto</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Ore rendicontate = somma timesheet approvati
        </Text>
      </div>
      <Table
        columns={colonne}
        dataSource={allocazioni ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Nessuna allocazione registrata' }}
        summary={(rows) => {
          if (!rows.length) return null;
          const totOre = rows.reduce((s, r) => s + Number((r as Allocazione).ore_assegnate), 0);
          const totEffettive = rows.reduce((s, r) =>
            s + oreEffettivePerPersona((r as Allocazione).persona_id), 0);
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Text strong>Totale</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text strong>{formatOre(totOre)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <Text strong style={{ color: '#185FA5' }}>{formatOre(totEffettive)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} colSpan={2} />
            </Table.Summary.Row>
          );
        }}
      />
    </div>
  );
}
