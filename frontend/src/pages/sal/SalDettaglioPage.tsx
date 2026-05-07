// frontend/src/pages/sal/SalDettaglioPage.tsx
import { useState } from 'react';
import { Table, Button, Tag, Space, Typography, App, Popconfirm,
         Card, Divider, Row, Col, Spin, Alert } from 'antd';
import { ArrowLeftOutlined, LockOutlined, SaveOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salApi } from '../../api/sal';
import { queryKeys } from '../../utils/queryKeys';
import { formatData, formatEuro } from '../../utils/formatters';
import { RbacGuard } from '../../components/common/RbacGuard';

const { Title, Text } = Typography;

const MESI = ['','Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
              'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

interface Voce {
  id: string;
  tipo: 'spesa' | 'timesheet';
  selezionato: boolean;
  importo: number;
  descrizione?: string;
  data?: string;
  persona_nome?: string;
  mese?: number;
  anno?: number;
  voce_descrizione?: string;
}

export function SalDettaglioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [selezionate, setSelezionate] = useState<string[]>([]);
  const [inizializzato, setInizializzato] = useState(false);
  const [modificato, setModificato] = useState(false);

  const { data: dettaglio, isLoading } = useQuery({
    queryKey: queryKeys.sal.detail(id!),
    queryFn: () => salApi.getDettaglio(id!).then(r => {
      const d = (r.data as { data: { sal: unknown; voci: Voce[]; totali_per_voce: unknown[]; totale: number } }).data;
      if (!inizializzato) {
        setSelezionate(d.voci.filter(v => v.selezionato).map(v => v.id));
        setInizializzato(true);
      }
      return d;
    }),
    enabled: !!id,
  });

  const associa = useMutation({
    mutationFn: () => {
      const spese_ids = (dettaglio?.voci ?? [])
        .filter(v => v.tipo === 'spesa' && selezionate.includes(v.id))
        .map(v => v.id);
      const timesheet_ids = (dettaglio?.voci ?? [])
        .filter(v => v.tipo === 'timesheet' && selezionate.includes(v.id))
        .map(v => v.id);
      return salApi.associaVoci(id!, { spese_ids, timesheet_ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sal.detail(id!) });
      notification.success({ message: 'Voci associate al SAL' });
      setModificato(false);
    },
    onError: () => notification.error({ message: 'Errore durante il salvataggio' }),
  });

  const chiudi = useMutation({
    mutationFn: () => salApi.chiudi(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sal.detail(id!) });
      notification.success({ message: 'SAL chiuso' });
    },
  });

  const downloadExcel = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `http://localhost:8000/api/v1/sal/${id}/export/xlsx`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) { notification.error({ message: 'Errore export' }); return; }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SAL_${(dettaglio?.sal as { numero?: number })?.numero ?? id}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!dettaglio) return <Text type="danger">SAL non trovato</Text>;

  const sal = dettaglio.sal as {
    id: string; numero: number; stato: string;
    data_inizio: string; data_fine: string; data_scadenza_rendiconto?: string;
  };
  const voci = dettaglio.voci ?? [];
  const spese = voci.filter(v => v.tipo === 'spesa');
  const timesheet = voci.filter(v => v.tipo === 'timesheet');
  const isAperto = sal.stato === 'aperto';

  const totSelezionate = voci
    .filter(v => selezionate.includes(v.id))
    .reduce((sum, v) => sum + v.importo, 0);

  const COLORI_STATO: Record<string, string> = {
    aperto: 'green', chiuso: 'orange', rendicontato: 'purple',
  };

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => navigate(-1)}
        style={{ paddingLeft: 0, marginBottom: 16 }}>
        Indietro
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>SAL {sal.numero}</Title>
          <Space style={{ marginTop: 4 }}>
            <Tag color={COLORI_STATO[sal.stato] ?? 'default'}>{sal.stato}</Tag>
            <Text type="secondary">{formatData(sal.data_inizio)} → {formatData(sal.data_fine)}</Text>
            {sal.data_scadenza_rendiconto && (
              <Text type="secondary">Scadenza: {formatData(sal.data_scadenza_rendiconto)}</Text>
            )}
          </Space>
        </div>
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={downloadExcel} disabled={modificato}>Esporta Excel</Button>
          <RbacGuard azione="sal:crea">
            {isAperto && (
              <>
                <Button icon={<SaveOutlined />} type="primary"
                  loading={associa.isPending} onClick={() => associa.mutate()}>
                  Salva selezione
                </Button>
                <Popconfirm title="Chiudere questo SAL?"
                  description="Una volta chiuso non sarà più modificabile."
                  onConfirm={() => chiudi.mutate()}
                  okText="Chiudi" cancelText="Annulla">
                  <Button icon={<LockOutlined />} danger loading={chiudi.isPending}>
                    Chiudi SAL
                  </Button>
                </Popconfirm>
              </>
            )}
          </RbacGuard>
        </Space>
      </div>

      {modificato && (
        <Alert
          type="warning"
          message="Hai modifiche non salvate — premi 'Salva selezione' prima di esportare"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16}>
        {/* Spese */}
        <Col span={12}>
          <Card title={`Spese del periodo (${spese.length})`} size="small">
            <Table
              size="small"
              pagination={false}
              dataSource={spese}
              rowKey="id"
              rowSelection={isAperto ? {
                selectedRowKeys: selezionate.filter(s => spese.map(x => x.id).includes(s)),
                onChange: keys => {
                  const altreVoci = selezionate.filter(s => !spese.map(x => x.id).includes(s));
                  setSelezionate([...altreVoci, ...(keys as string[])]);
                  setModificato(true);
                },
              } : undefined}
              columns={[
                { title: 'Data', dataIndex: 'data', width: 100, render: formatData },
                { title: 'Descrizione', dataIndex: 'descrizione', ellipsis: true },
                { title: 'Voce', dataIndex: 'voce_descrizione', ellipsis: true },
                { title: 'Importo', dataIndex: 'importo', width: 110, align: 'right' as const,
                  render: (v: number) => formatEuro(v) },
              ]}
              footer={() => (
                <div style={{ textAlign: 'right' }}>
                  <Text strong>
                    Selezionate: {formatEuro(spese.filter(s => selezionate.includes(s.id))
                      .reduce((sum, s) => sum + s.importo, 0))}
                  </Text>
                </div>
              )}
            />
          </Card>
        </Col>

        {/* Timesheet */}
        <Col span={12}>
          <Card title={`Timesheet approvati (${timesheet.length})`} size="small">
            <Table
              size="small"
              pagination={false}
              dataSource={timesheet}
              rowKey="id"
              rowSelection={isAperto ? {
                selectedRowKeys: selezionate.filter(s => timesheet.map(x => x.id).includes(s)),
                onChange: keys => {
                  const altreVoci = selezionate.filter(s => !timesheet.map(x => x.id).includes(s));
                  setSelezionate([...altreVoci, ...(keys as string[])]);
                  setModificato(true);
                },
              } : undefined}
              columns={[
                { title: 'Persona', dataIndex: 'persona_nome', ellipsis: true },
                { title: 'Mese', key: 'periodo', width: 120,
                  render: (_: unknown, r: Voce) =>
                    r.mese ? `${MESI[r.mese]} ${r.anno}` : '—' },
                { title: 'Costo', dataIndex: 'importo', width: 110, align: 'right' as const,
                  render: (v: number) => formatEuro(v) },
              ]}
              footer={() => (
                <div style={{ textAlign: 'right' }}>
                  <Text strong>
                    Selezionati: {formatEuro(timesheet.filter(t => selezionate.includes(t.id))
                      .reduce((sum, t) => sum + t.importo, 0))}
                  </Text>
                </div>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Totali per voce */}
      {dettaglio.totali_per_voce?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Totali per voce di costo</Text>
          <Table
            size="small"
            pagination={false}
            dataSource={dettaglio.totali_per_voce as { voce_id: string; voce_descrizione: string; importo: number }[]}
            rowKey="voce_id"
            columns={[
              { title: 'Voce di costo', dataIndex: 'voce_descrizione' },
              { title: 'Importo', dataIndex: 'importo', align: 'right' as const,
                render: (v: number) => formatEuro(v) },
            ]}
          />
        </div>
      )}

      <div style={{ textAlign: 'right' }}>
        <Text strong style={{ fontSize: 16 }}>
          Totale SAL selezionato: {formatEuro(totSelezionate)}
        </Text>
      </div>
    </div>
  );
}
