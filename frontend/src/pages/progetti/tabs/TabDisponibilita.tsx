import { Row, Col, Statistic, Typography, Divider, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { queryKeys } from '../../../utils/queryKeys';

const { Title, Text } = Typography;

const fmtEuro = (v: number): string => {
  const parts = v.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

interface Props { progettoId: string; }

export function TabDisponibilita({ progettoId }: Props) {
  const { data: disponibilitaData } = useQuery({
    queryKey: queryKeys.progetti.disponibilita(progettoId),
    queryFn: () => progettiApi.getDisponibilita(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const totaleErogato = disponibilitaData?.totale_erogato ?? 0;
  const totaleSpeso = disponibilitaData?.totale_speso ?? 0;
  const totaleImpegnato = disponibilitaData?.totale_impegnato ?? 0;
  const disponibilita = disponibilitaData?.disponibilita ?? 0;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Disponibilità fondi</Title>

      {/* Formula */}
      <div style={{ background: '#fafafa', padding: '20px 24px', borderRadius: 8, marginBottom: 24 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Disponibilità = Totale erogato − (Spese registrate + Impegni attivi)
        </Text>
      </div>

      <Row gutter={32} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic
            title="Totale erogato"
            value={fmtEuro(totaleErogato)}
            valueStyle={{ color: '#1677ff', fontSize: 20 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>Fondi ricevuti dal finanziatore</Text>
        </Col>
        <Col span={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#999' }}>
          −
        </Col>
        <Col span={6}>
          <Statistic
            title="Spese registrate"
            value={fmtEuro(totaleSpeso)}
            valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>Somma spese in stato "registrata"</Text>
        </Col>
        <Col span={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#999' }}>
          −
        </Col>
        <Col span={6}>
          <Statistic
            title="Impegni attivi"
            value={fmtEuro(totaleImpegnato)}
            valueStyle={{ color: '#fa8c16', fontSize: 20 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>Impegni non ancora coperti da spesa</Text>
        </Col>
        <Col span={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#999' }}>
          =
        </Col>
        <Col span={3}>
          <Statistic
            title="Disponibilità"
            value={fmtEuro(disponibilita)}
            valueStyle={{
              color: disponibilita >= 0 ? '#52c41a' : '#ff4d4f',
              fontWeight: 700,
              fontSize: 22,
            }}
          />
        </Col>
      </Row>

      <Divider />

      {disponibilita < 0 && (
        <Alert
          type="error"
          showIcon
          message="Disponibilità negativa"
          description={`Le spese e gli impegni superano i fondi erogati di ${fmtEuro(Math.abs(disponibilita))}.`}
          style={{ marginTop: 16 }}
        />
      )}
      {disponibilita === 0 && totaleErogato > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Fondi completamente utilizzati"
          description="Le spese e gli impegni coprono esattamente i fondi erogati."
          style={{ marginTop: 16 }}
        />
      )}
      {disponibilita > 0 && totaleErogato > 0 && (
        <Alert
          type="success"
          showIcon
          message={`Disponibilità: ${fmtEuro(disponibilita)}`}
          description="I fondi erogati sono sufficienti a coprire spese e impegni attivi."
          style={{ marginTop: 16 }}
        />
      )}
      {totaleErogato === 0 && (
        <Alert
          type="info"
          showIcon
          message="Nessuna erogazione registrata"
          description="Registra le erogazioni nel tab Erogazioni per visualizzare la disponibilità reale."
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
}
