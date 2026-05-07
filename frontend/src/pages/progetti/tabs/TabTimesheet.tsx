// frontend/src/pages/progetti/tabs/TabTimesheet.tsx
import { Table, Button, Tag, Space, Typography, Badge } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { timesheetApi } from '../../../api/timesheet';
import { queryKeys } from '../../../utils/queryKeys';
import type { TimesheetTestata } from '../../../types/timesheet';

const { Text } = Typography;

const MESI = ['','Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
              'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const COLORI_STATO: Record<string, string> = {
  bozza: 'default', inviato: 'blue', approvato: 'green', rifiutato: 'red',
};

interface Props { progettoId: string; }

export function TabTimesheet({ progettoId }: Props) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.timesheet.list({ progetto_id: progettoId }),
    queryFn: () => timesheetApi.list({ progetto_id: progettoId }).then(r => r.data),
    enabled: !!progettoId,
  });

  const timesheet: TimesheetTestata[] = data?.data ?? [];
  const inAttesa = timesheet.filter(t => t.stato === 'inviato').length;

  const colonne = [
    {
      title: 'Persona', dataIndex: 'persona_nome', width: 160,
    },
    {
      title: 'Periodo', key: 'periodo',
      render: (_: unknown, r: TimesheetTestata) => `${MESI[r.mese]} ${r.anno}`,
    },
    {
      title: 'Ore progetto', dataIndex: 'ore_totali_progetto', width: 130,
      render: (v: number) => v ? `${v}h` : '—',
    },
    {
      title: 'Stato', dataIndex: 'stato', width: 110,
      render: (stato: string) => (
        <Badge dot={stato === 'inviato'} offset={[4, 0]}>
          <Tag color={COLORI_STATO[stato]}>{stato}</Tag>
        </Badge>
      ),
    },
    {
      title: '', key: 'azioni', width: 80,
      render: (_: unknown, r: TimesheetTestata) => (
        <Button size="small" icon={<EditOutlined />}
          onClick={() => navigate(`/timesheet/${r.id}`)}>
          Apri
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text strong>Timesheet del progetto</Text>
          {inAttesa > 0 && (
            <Tag color="blue">{inAttesa} in attesa di approvazione</Tag>
          )}
        </Space>
        <Button icon={<PlusOutlined />} onClick={() => navigate(`/timesheet?progetto_id=${progettoId}`)}>
          Nuovo timesheet
        </Button>
      </div>

      <Table
        columns={colonne}
        dataSource={timesheet}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Nessun timesheet per questo progetto' }}
      />
    </div>
  );
}
