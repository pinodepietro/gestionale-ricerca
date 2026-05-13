import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Progress, Tag, Typography, Statistic, Row, Col, Card, Alert, Divider } from 'antd';
import {
  ProjectOutlined, EuroOutlined, WarningOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { progettiApi } from '../../api/progetti';
import { queryKeys } from '../../utils/queryKeys';
import { formatEuro, formatData } from '../../utils/formatters';
import type { PortfolioProgetto } from '../../types/progetto';

const { Title, Text } = Typography;

function Barra({ pct, label }: { pct: number; label?: string }) {
  const color = pct >= 90 ? '#ff4d4f' : pct >= 70 ? '#faad14' : '#52c41a';
  return (
    <div style={{ minWidth: 140 }}>
      <Progress
        percent={Math.min(pct, 100)}
        size="small"
        strokeColor={color}
        format={() => `${pct}%`}
      />
      {label && <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>}
    </div>
  );
}

export function PortfolioPage() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.progetti.portfolio,
    queryFn: () => progettiApi.portfolio().then(r => r.data.data),
  });

  const expandedRowRender = (r: PortfolioProgetto) => (
    <div style={{ padding: '14px 24px', background: '#fafafa', borderRadius: 8 }}>
      <Row gutter={40}>
        <Col span={6}>
          <Text type="secondary" style={{ fontSize: 12 }}>PI</Text>
          <div style={{ fontWeight: 500 }}>{r.pi_nome ?? '—'}</div>
        </Col>
        <Col span={6}>
          <Text type="secondary" style={{ fontSize: 12 }}>Durata</Text>
          <div style={{ fontWeight: 500 }}>
            {r.data_inizio ? formatData(r.data_inizio) : '—'} → {r.data_fine ? formatData(r.data_fine) : '—'}
          </div>
        </Col>
        <Col span={6}>
          <Text type="secondary" style={{ fontSize: 12 }}>Costo totale progetto</Text>
          <div style={{ fontWeight: 500 }}>{formatEuro(r.costo_totale)}</div>
        </Col>
        <Col span={6}>
          <Text type="secondary" style={{ fontSize: 12 }}>Avanzamento temporale</Text>
          <Barra pct={r.percentuale_tempo} />
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      <Row gutter={40}>
        {/* Dimensione 1: Finanziato vs Speso */}
        <Col span={12}>
          <Text strong style={{ fontSize: 12 }}>Finanziato vs Speso</Text>
          <div style={{ marginTop: 6 }}>
            <Barra
              pct={r.pct_speso}
              label={`${formatEuro(r.spese_documentate)} spesi / ${formatEuro(r.importo_finanziato)} finanziati`}
            />
          </div>
        </Col>
        {/* Dimensione 2: Pianificato vs Rendicontato */}
        <Col span={12}>
          <Text strong style={{ fontSize: 12 }}>Pianificato vs Rendicontato</Text>
          <div style={{ marginTop: 6 }}>
            <Barra
              pct={r.pct_rendicontato}
              label={`${formatEuro(r.rendicontato)} rendicontati / ${formatEuro(r.pianificato)} pianificati`}
            />
          </div>
        </Col>
      </Row>
    </div>
  );

  const columns = [
    {
      title: 'Codice',
      dataIndex: 'codice',
      width: 120,
      render: (codice: string, r: PortfolioProgetto) => (
        <a onClick={() => navigate(`/progetti/${r.id}`)} style={{ fontWeight: 600 }}>{codice}</a>
      ),
    },
    {
      title: 'Acronimo / Titolo',
      key: 'titolo',
      ellipsis: true,
      render: (_: unknown, r: PortfolioProgetto) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.acronimo}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.titolo}</Text>
        </div>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      width: 130,
      render: (tipo: string) => tipo ? <Tag>{tipo}</Tag> : '—',
    },
    {
      title: 'Finanziato vs Speso',
      key: 'speso',
      width: 200,
      render: (_: unknown, r: PortfolioProgetto) => (
        <Barra
          pct={r.pct_speso}
          label={`${formatEuro(r.spese_documentate)} / ${formatEuro(r.importo_finanziato)}`}
        />
      ),
    },
    {
      title: 'Pianificato vs Rendicontato',
      key: 'rendicontato',
      width: 220,
      render: (_: unknown, r: PortfolioProgetto) => (
        <Barra
          pct={r.pct_rendicontato}
          label={`${formatEuro(r.rendicontato)} / ${formatEuro(r.pianificato)}`}
        />
      ),
    },
    {
      title: 'PI',
      dataIndex: 'pi_nome',
      width: 150,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Fine',
      dataIndex: 'data_fine',
      width: 110,
      render: (v: string | null) => {
        if (!v) return '—';
        const giorni = Math.ceil((new Date(v).getTime() - Date.now()) / 86400000);
        const colore = giorni < 30 ? '#ff4d4f' : giorni < 90 ? '#faad14' : undefined;
        return <span style={{ color: colore, fontWeight: colore ? 600 : undefined }}>{formatData(v)}</span>;
      },
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Portfolio Progetti</Title>

      {/* Alert */}
      {data && (data.timesheet_pendenti > 0 || data.sal_in_scadenza > 0) && (
        <Row gutter={12} style={{ marginBottom: 20 }}>
          {data.timesheet_pendenti > 0 && (
            <Col>
              <Alert type="warning" showIcon icon={<FileTextOutlined />}
                message={`${data.timesheet_pendenti} timesheet in attesa di approvazione`} />
            </Col>
          )}
          {data.sal_in_scadenza > 0 && (
            <Col>
              <Alert type="error" showIcon icon={<WarningOutlined />}
                message={`${data.sal_in_scadenza} SAL in scadenza nei prossimi 30 giorni`} />
            </Col>
          )}
        </Row>
      )}

      {/* KPI */}
      <Row gutter={16} style={{ marginBottom: 28 }}>
        <Col xs={24} sm={12} lg={4}>
          <Card size="small">
            <Statistic title="Progetti attivi" value={data?.progetti_attivi ?? 0}
              prefix={<ProjectOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card size="small">
            <Statistic title="Costo totale portfolio" prefix={<EuroOutlined />}
              value={data?.costo_totale_portfolio ?? 0}
              formatter={v => formatEuro(Number(v))} valueStyle={{ color: '#595959', fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card size="small">
            <Statistic title="Totale finanziato" prefix={<EuroOutlined />}
              value={data?.importo_finanziato_portfolio ?? 0}
              formatter={v => formatEuro(Number(v))} valueStyle={{ color: '#52c41a', fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card size="small">
            <Statistic title="Spese registrate" prefix={<EuroOutlined />}
              value={data?.spese_totali ?? 0}
              formatter={v => formatEuro(Number(v))}
              valueStyle={{ color: (data?.pct_speso ?? 0) >= 80 ? '#ff4d4f' : '#faad14', fontSize: 18 }} />
            <Text type="secondary" style={{ fontSize: 11 }}>{data?.pct_speso ?? 0}% del finanziato</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card size="small">
            <Statistic title="Rendicontato" prefix={<EuroOutlined />}
              value={data?.budget_rendicontato ?? 0}
              formatter={v => formatEuro(Number(v))}
              valueStyle={{ color: (data?.pct_rendicontato ?? 0) >= 80 ? '#ff4d4f' : '#1677ff', fontSize: 18 }} />
            <Text type="secondary" style={{ fontSize: 11 }}>{data?.pct_rendicontato ?? 0}% del pianificato</Text>
          </Card>
        </Col>
      </Row>

      {/* Tabella */}
      <Card>
        <Table
          columns={columns}
          dataSource={data?.progetti ?? []}
          rowKey="id"
          loading={isLoading}
          expandable={{ expandedRowRender }}
          pagination={false}
          size="middle"
          locale={{ emptyText: error ? 'Errore nel caricamento' : 'Nessun progetto attivo' }}
        />
      </Card>
    </div>
  );
}
