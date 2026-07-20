// frontend/src/pages/progetti/tabs/TabPersonale.tsx
import { Table, Tag, Typography, Space, Progress, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { progettiApi } from '../../../api/progetti';
import { timesheetApi } from '../../../api/timesheet';
import { budgetApi } from '../../../api/budget';
import { queryKeys } from '../../../utils/queryKeys';
import { formatData, formatOre, formatEuro } from '../../../utils/formatters';
import type { BudgetVoce } from '../../../types/budget';
import type { WorkPackage } from '../../../types/struttura';

const { Text } = Typography;

interface Allocazione {
  id: string;
  persona_id: string;
  wp_id?: string | null;
  ore_assegnate: number;
  costo_orario: number;
  data_inizio: string;
  data_fine: string;
  note?: string;
  is_pi?: boolean;
  is_ammin?: boolean;
  persona?: { nome: string; cognome: string } | null;
}

interface Props { progettoId: string; }

export function TabPersonale({ progettoId }: Props) {
  const navigate = useNavigate();

  const { data: allocazioni, isLoading } = useQuery({
    queryKey: queryKeys.progetti.allocazioni(progettoId),
    queryFn: () => progettiApi.allocazioni.list(progettoId).then(r => r.data.data as Allocazione[]),
    enabled: !!progettoId,
  });

  const { data: timesheetData } = useQuery({
    queryKey: queryKeys.timesheet.list({ progetto_id: progettoId }),
    queryFn: () => timesheetApi.list({ progetto_id: progettoId }).then(r => r.data),
    enabled: !!progettoId,
  });
  const timesheet = timesheetData?.data ?? [];

  const { data: budgetVoci } = useQuery({
    queryKey: queryKeys.progetti.budget(progettoId),
    queryFn: () => budgetApi.voci.list(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId),
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });
  const gestionePerWp: boolean = progetto?.gestione_per_wp ?? false;

  const { data: wps } = useQuery({
    queryKey: ['wp', progettoId],
    queryFn: () => progettiApi.wp.list(progettoId).then(r => r.data.data as WorkPackage[]),
    enabled: gestionePerWp,
  });
  const wpNome = (wpId: string | null | undefined) => {
    if (!wpId) return null;
    const wp = wps?.find(w => w.id === wpId);
    return wp ? `${wp.codice} — ${wp.titolo}` : wpId;
  };

  const nomPersona = (r: Allocazione) =>
    r.persona ? `${r.persona.nome} ${r.persona.cognome}` : '—';

  const ruoloPersona = (_r: Allocazione) => '';

  const oreRendicontatePerPersona = (personaId: string): number =>
    timesheet
      .filter((ts: { persona_id: string; stato: string }) =>
        ts.persona_id === personaId && ts.stato === 'approvato')
      .reduce((sum: number, ts: { ore_totali_progetto?: number }) =>
        sum + (ts.ore_totali_progetto ?? 0), 0);

  const isAttivo = (dataInizio: string, dataFine: string) => {
    const oggi = new Date();
    return new Date(dataInizio) <= oggi && new Date(dataFine) >= oggi;
  };

  // Budget voce personale (A.1 o categoria personale)
  const budgetPersonale = (budgetVoci as BudgetVoce[] | undefined)
    ?.find(v => v.voce?.codice === 'A.1' || v.voce?.categoria === 'personale')
    ?.importo_previsto ?? 0;

  const colonne = [
    ...(gestionePerWp ? [{
      title: 'WP', dataIndex: 'wp_id', width: 150,
      render: (id: string | null) => id
        ? <Tooltip title={wpNome(id)} overlayStyle={{ maxWidth: 400 }}>
            <Tag color="blue" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100%' }}>
              {wpNome(id)}
            </Tag>
          </Tooltip>
        : <Text type="secondary">—</Text>,
    }] : []),
    {
      title: 'Persona', key: 'persona',
      render: (_: unknown, r: Allocazione) => (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            <Tooltip title={nomPersona(r)} overlayStyle={{ maxWidth: 400 }}>
              <Text strong style={{ cursor: 'pointer', color: '#185FA5', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: 120 }}
                onClick={() => navigate(`/personale/${r.persona_id}`)}>
                {nomPersona(r)}
              </Text>
            </Tooltip>
            {r.is_pi && <Tag color="blue" style={{ fontSize: 11, padding: '0 4px' }}>PI</Tag>}
            {r.is_ammin && <Tag color="orange" style={{ fontSize: 11, padding: '0 4px' }}>Ammin</Tag>}
          </Space>
          {ruoloPersona(r) && <Text type="secondary" style={{ fontSize: 12 }}>{ruoloPersona(r)}</Text>}
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
      title: 'Ore ass.', dataIndex: 'ore_assegnate', width: 90, align: 'right' as const,
      render: (v: number) => <Text strong>{formatOre(v)}</Text>,
    },
    {
      title: 'Costo', key: 'costo', width: 110, align: 'right' as const,
      render: (_: unknown, r: Allocazione) => {
        const costo = r.ore_assegnate * (r.costo_orario ?? 0);
        return <Text strong style={{ color: '#b45309' }}>{formatEuro(costo)}</Text>;
      },
    },
    {
      title: 'Ore rend.', key: 'ore_rend', width: 90, align: 'right' as const,
      render: (_: unknown, r: Allocazione) => (
        <Text style={{ color: '#185FA5' }}>{formatOre(oreRendicontatePerPersona(r.persona_id))}</Text>
      ),
    },
    {
      title: 'Costo rend.', key: 'costo_rend', width: 110, align: 'right' as const,
      render: (_: unknown, r: Allocazione) => {
        const costo = oreRendicontatePerPersona(r.persona_id) * (r.costo_orario ?? 0);
        return <Text style={{ color: '#065f46' }}>{formatEuro(costo)}</Text>;
      },
    },
    {
      title: 'Avanzamento', key: 'avanzamento', width: 160,
      render: (_: unknown, r: Allocazione) => {
        const effettive = oreRendicontatePerPersona(r.persona_id);
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
          Costo = ore × tariffa oraria individuale &nbsp;·&nbsp; Ore rend. = timesheet approvati
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
          const totCosto = rows.reduce((s, r) => {
            const a = r as Allocazione;
            return s + a.ore_assegnate * (a.costo_orario ?? 0);
          }, 0);
          const totRend = rows.reduce((s, r) =>
            s + oreRendicontatePerPersona((r as Allocazione).persona_id), 0);
          const totCostoRend = rows.reduce((s, r) => {
            const a = r as Allocazione;
            return s + oreRendicontatePerPersona(a.persona_id) * (a.costo_orario ?? 0);
          }, 0);
          const costoRimanente = budgetPersonale - totCosto;

          return (
            <>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong>Totale</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong style={{ whiteSpace: 'nowrap' }}>{formatOre(totOre)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong style={{ color: '#b45309', whiteSpace: 'nowrap' }}>{formatEuro(totCosto)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong style={{ color: '#185FA5', whiteSpace: 'nowrap' }}>{formatOre(totRend)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong style={{ color: '#065f46', whiteSpace: 'nowrap' }}>{formatEuro(totCostoRend)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} colSpan={2} />
              </Table.Summary.Row>
              {budgetPersonale > 0 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong type={costoRimanente < 0 ? 'danger' : undefined}>
                      Costo rimanente da allocare
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong type={costoRimanente < 0 ? 'danger' : 'success'} style={{ whiteSpace: 'nowrap' }}>
                      {formatEuro(costoRimanente)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={4} />
                </Table.Summary.Row>
              )}
            </>
          );
        }}
      />
    </div>
  );
}
