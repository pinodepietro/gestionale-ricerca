// frontend/src/pages/sal/SalPage.tsx
import { useState } from 'react';
import { Table, Tag, Typography, Select, Space, Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { salApi } from '../../api/sal';
import { progettiApi } from '../../api/progetti';
import { queryKeys } from '../../utils/queryKeys';
import { formatData } from '../../utils/formatters';
import { useAuthStore } from '../../store/useAuthStore';
import { canDo } from '../../utils/rbac';

const { Title, Text } = Typography;

const COLORI_STATO: Record<string, string> = {
  aperto: 'green', chiuso: 'orange', contestato: 'red',
  rendicontato: 'purple', in_preparazione: 'blue',
};

export function SalPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [filtroProgetto, setFiltroProgetto] = useState<string | undefined>();

  if (!user || !canDo(user.ruolo, 'sal:visualizza')) {
    return <Result status="403" title="Accesso non consentito"
      subTitle="Non hai i permessi per accedere alla rendicontazione."
      extra={<Button onClick={() => navigate('/progetti')}>Torna ai progetti</Button>} />;
  }

  const { data: progetti } = useQuery({
    queryKey: queryKeys.progetti.list({ stato: 'attivo' }),
    queryFn: () => progettiApi.list({ stato: 'attivo' }).then(r => r.data.data),
  });

  const { data: sal, isLoading } = useQuery({
    queryKey: queryKeys.sal.byProgetto(filtroProgetto ?? ''),
    queryFn: () => filtroProgetto
      ? salApi.list(filtroProgetto).then(r => r.data.data)
      : Promise.resolve([]),
    enabled: !!filtroProgetto,
  });

  const colonne = [
    {
      title: 'N°', dataIndex: 'numero', width: 60,
      render: (v: number) => <Text strong>SAL {v}</Text>,
    },
    {
      title: 'Periodo', key: 'periodo', width: 200,
      render: (_: unknown, r: { data_inizio: string; data_fine: string }) =>
        `${formatData(r.data_inizio)} → ${formatData(r.data_fine)}`,
    },
    {
      title: 'Scadenza rendiconto', dataIndex: 'data_scadenza_rendiconto', width: 160,
      render: (v: string) => {
        if (!v) return '—';
        const gg = Math.ceil((new Date(v).getTime() - Date.now()) / 86400000);
        return (
          <Space>
            <Text>{formatData(v)}</Text>
            {gg >= 0 && gg <= 30 && <Tag color="orange">{gg}gg</Tag>}
            {gg < 0 && <Tag color="red">Scaduto</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Stato', dataIndex: 'stato', width: 120,
      render: (v: string) => <Tag color={COLORI_STATO[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: '', key: 'azioni', width: 80,
      render: (_: unknown, r: { id: string }) => (
        <Button size="small" onClick={() => navigate(`/sal/${r.id}`)}>Apri</Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Rendicontazione SAL</Title>

      <Space style={{ marginBottom: 16 }}>
        <Text>Seleziona progetto:</Text>
        <Select
          placeholder="Scegli un progetto"
          style={{ width: 350 }}
          value={filtroProgetto}
          onChange={setFiltroProgetto}
          options={progetti?.map((p: { id: string; acronimo: string; titolo: string; codice: string }) => ({
            value: p.id,
            label: `${p.acronimo || p.codice} — ${p.titolo}`,
          }))}
          showSearch
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
        />
      </Space>

      {filtroProgetto ? (
        <Table
          columns={colonne}
          dataSource={sal ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'Nessun SAL per questo progetto' }}
        />
      ) : (
        <Text type="secondary">Seleziona un progetto per vedere i SAL</Text>
      )}
    </div>
  );
}
