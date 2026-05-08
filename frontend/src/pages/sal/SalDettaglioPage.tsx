// frontend/src/pages/sal/SalDettaglioPage.tsx
import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Typography, App, Popconfirm,
         Card, Divider, Row, Col, Spin, Modal, Form, Input, InputNumber, DatePicker, Result } from 'antd';
import { ArrowLeftOutlined, LockOutlined, SaveOutlined, FileExcelOutlined, FilePdfOutlined,
         SendOutlined, WarningOutlined, CheckCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { salApi } from '../../api/sal';
import { progettiApi } from '../../api/progetti';
import { queryKeys } from '../../utils/queryKeys';
import { apiErrorMessage } from '../../utils/apiError';
import { formatData, formatEuro } from '../../utils/formatters';
import { RbacGuard } from '../../components/common/RbacGuard';
import { env } from '../../config/env';
import { useAuthStore } from '../../store/useAuthStore';
import { canDo } from '../../utils/rbac';

const { Title, Text } = Typography;

const MESI = ['','Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
              'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const COLORI_STATO: Record<string, string> = {
  aperto: 'green', chiuso: 'orange', inviato: 'blue',
  contestato: 'red', rendicontato: 'purple',
};

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

interface SalInfo {
  id: string; numero: number; stato: string; progetto_id: string;
  data_inizio: string; data_fine: string; data_scadenza_rendiconto?: string;
  importo_erogato?: number; data_erogazione?: string; motivo_contestazione?: string;
}

export function SalDettaglioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [selezionate, setSelezionate] = useState<string[]>([]);
  const [inizializzato, setInizializzato] = useState(false);
  const [modificato, setModificato] = useState(false);
  const [contestaVisible, setContestaVisible] = useState(false);
  const [erogazioneVisible, setErogazioneVisible] = useState(false);
  const [formContesta] = Form.useForm();
  const [formErogazione] = Form.useForm();

  const { data: dettaglio, isLoading } = useQuery({
    queryKey: queryKeys.sal.detail(id!),
    queryFn: () => salApi.getDettaglio(id!).then(r =>
      (r.data as { data: { sal: SalInfo; voci: Voce[]; totali_per_voce: { voce_id: string; voce_descrizione: string; importo: number }[]; totale: number } }).data
    ),
    enabled: !!id,
  });

  const progettoId = dettaglio?.sal.progetto_id;
  const { data: allocazioni } = useQuery({
    queryKey: queryKeys.progetti.allocazioni(progettoId ?? ''),
    queryFn: () => progettiApi.allocazioni.list(progettoId!).then(r => r.data.data),
    enabled: !!progettoId,
  });

  // Inizializza le selezioni dai dati server (solo al primo caricamento)
  useEffect(() => {
    if (dettaglio && !inizializzato) {
      setSelezionate(dettaglio.voci.filter(v => v.selezionato).map(v => v.id));
      setInizializzato(true);
    }
  }, [dettaglio, inizializzato]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.sal.detail(id!) });

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
      invalidate();
      notification.success({ message: 'Voci associate al SAL' });
      setModificato(false);
    },
    onError: () => notification.error({ message: 'Errore durante il salvataggio' }),
  });

  const chiudi = useMutation({
    mutationFn: () => salApi.chiudi(id!),
    onSuccess: () => { invalidate(); notification.success({ message: 'SAL chiuso' }); },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante la chiusura') }),
  });

  const invia = useMutation({
    mutationFn: () => salApi.invia(id!),
    onSuccess: () => { invalidate(); notification.success({ message: 'SAL inviato per approvazione' }); },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante l\'invio') }),
  });

  const contesta = useMutation({
    mutationFn: (motivo: string) => salApi.contesta(id!, motivo),
    onSuccess: () => {
      invalidate();
      notification.success({ message: 'SAL contestato' });
      setContestaVisible(false);
      formContesta.resetFields();
    },
    onError: () => notification.error({ message: 'Errore durante la contestazione' }),
  });

  const rendiconta = useMutation({
    mutationFn: () => salApi.rendiconta(id!),
    onSuccess: () => { invalidate(); notification.success({ message: 'SAL rendicontato' }); },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante la rendicontazione') }),
  });

  const registraErogazione = useMutation({
    mutationFn: (values: { importo_erogato: number; data_erogazione: dayjs.Dayjs }) =>
      salApi.registraErogazione(id!, {
        importo_erogato: values.importo_erogato,
        data_erogazione: values.data_erogazione.format('YYYY-MM-DD'),
      }),
    onSuccess: () => {
      invalidate();
      notification.success({ message: 'Erogazione registrata' });
      setErogazioneVisible(false);
      formErogazione.resetFields();
    },
    onError: () => notification.error({ message: 'Errore durante la registrazione' }),
  });

  const downloadExcel = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `${env.apiUrl}/api/v1/sal/${id}/export/xlsx`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) { notification.error({ message: 'Errore export' }); return; }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SAL_${sal?.numero ?? id}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPdf = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `${env.apiUrl}/api/v1/sal/${id}/export/pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) { notification.error({ message: 'Errore generazione PDF' }); return; }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SAL_${sal?.numero ?? id}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const user = useAuthStore(s => s.user);
  if (!user || !canDo(user.ruolo, 'sal:visualizza')) {
    return <Result status="403" title="Accesso non consentito"
      subTitle="Non hai i permessi per accedere alla rendicontazione."
      extra={<Button onClick={() => navigate('/progetti')}>Torna ai progetti</Button>} />;
  }

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!dettaglio) return <Text type="danger">SAL non trovato</Text>;

  const sal = dettaglio.sal;
  const voci = dettaglio.voci ?? [];
  const spese = voci.filter(v => v.tipo === 'spesa');
  const timesheet = voci.filter(v => v.tipo === 'timesheet');
  const isAperto = sal.stato === 'aperto';
  const isChiuso = sal.stato === 'chiuso';
  const isInviato = sal.stato === 'inviato';
  const isContestato = sal.stato === 'contestato';
  const isRendicontato = sal.stato === 'rendicontato';
  const puoModificare = isAperto && canDo(user!.ruolo, 'sal:crea');
  const ePI = (allocazioni as { persona_id: string; is_pi?: boolean }[] | undefined)
    ?.some(a => a.persona_id === user!.id && a.is_pi) ?? false;
  const puoEsportare = user!.ruolo !== 'ricercatore' || ePI;

  const totSelezionate = voci
    .filter(v => selezionate.includes(v.id))
    .reduce((sum, v) => sum + v.importo, 0);

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
          {isContestato && sal.motivo_contestazione && (
            <div style={{ marginTop: 8 }}>
              <Text type="danger">Motivo contestazione: {sal.motivo_contestazione}</Text>
            </div>
          )}
          {isRendicontato && sal.importo_erogato && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Erogato: <Text strong>{formatEuro(sal.importo_erogato)}</Text>
                {sal.data_erogazione && ` il ${formatData(sal.data_erogazione)}`}
              </Text>
            </div>
          )}
        </div>

        <Space wrap>
          {puoEsportare && (
            <Button icon={<FileExcelOutlined />} onClick={downloadExcel} disabled={modificato}>
              Esporta Excel
            </Button>
          )}
          {puoEsportare && (
            <Button icon={<FilePdfOutlined />} onClick={downloadPdf} disabled={modificato}>
              Genera PDF
            </Button>
          )}

          {/* Aperto: salva selezione + chiudi */}
          <RbacGuard azione="sal:crea">
            {isAperto && (
              <>
                <Button icon={<SaveOutlined />} type="primary"
                  loading={associa.isPending} onClick={() => associa.mutate()}>
                  Salva selezione
                </Button>
                <Popconfirm title="Chiudere questo SAL?"
                  description="Una volta chiuso le voci selezionate saranno bloccate."
                  onConfirm={() => chiudi.mutate()}
                  okText="Chiudi" cancelText="Annulla">
                  <Button icon={<LockOutlined />} danger loading={chiudi.isPending}>
                    Chiudi SAL
                  </Button>
                </Popconfirm>
              </>
            )}
          </RbacGuard>

          {/* Chiuso o Contestato: invia */}
          <RbacGuard azione="sal:invia">
            {(isChiuso || isContestato) && (
              <Popconfirm title="Inviare il SAL per approvazione?"
                onConfirm={() => invia.mutate()}
                okText="Invia" cancelText="Annulla">
                <Button icon={<SendOutlined />} type="primary" loading={invia.isPending}>
                  Invia SAL
                </Button>
              </Popconfirm>
            )}
          </RbacGuard>

          {/* Inviato: contesta o rendiconta */}
          <RbacGuard azione="sal:contesta">
            {isInviato && (
              <Button icon={<WarningOutlined />} danger onClick={() => setContestaVisible(true)}>
                Contesta
              </Button>
            )}
          </RbacGuard>
          <RbacGuard azione="sal:rendiconta">
            {isInviato && (
              <Popconfirm title="Rendicontare questo SAL?"
                description="Il SAL passerà in stato rendicontato definitivamente."
                onConfirm={() => rendiconta.mutate()}
                okText="Rendiconta" cancelText="Annulla">
                <Button icon={<CheckCircleOutlined />} type="primary"
                  loading={rendiconta.isPending} style={{ background: '#722ed1', borderColor: '#722ed1' }}>
                  Rendiconta
                </Button>
              </Popconfirm>
            )}
          </RbacGuard>

          {/* Rendicontato: registra erogazione */}
          <RbacGuard azione="sal:registra_erogazione">
            {isRendicontato && !sal.importo_erogato && (
              <Button icon={<DollarOutlined />} onClick={() => setErogazioneVisible(true)}>
                Registra erogazione
              </Button>
            )}
          </RbacGuard>
        </Space>
      </div>

      <Row gutter={16}>
        {/* Spese */}
        <Col span={12}>
          <Card title={`Spese del periodo (${spese.length})`} size="small">
            <Table
              size="small"
              pagination={false}
              dataSource={spese}
              rowKey="id"
              rowSelection={puoModificare ? {
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
              rowSelection={puoModificare ? {
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

      {dettaglio.totali_per_voce?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Totali per voce di costo</Text>
          <Table
            size="small"
            pagination={false}
            dataSource={dettaglio.totali_per_voce}
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

      {/* Modal contestazione */}
      <Modal
        title="Contesta SAL"
        open={contestaVisible}
        onCancel={() => { setContestaVisible(false); formContesta.resetFields(); }}
        onOk={() => formContesta.submit()}
        okText="Contesta" okButtonProps={{ danger: true }}
        cancelText="Annulla"
        confirmLoading={contesta.isPending}
      >
        <Form form={formContesta} layout="vertical" style={{ marginTop: 16 }}
          onFinish={(v) => contesta.mutate(v.motivo)}>
          <Form.Item name="motivo" label="Motivo della contestazione"
            rules={[{ required: true, message: 'Inserire il motivo della contestazione' }]}>
            <Input.TextArea rows={4} placeholder="Descrivi il motivo per cui il SAL viene contestato..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal registra erogazione */}
      <Modal
        title="Registra erogazione"
        open={erogazioneVisible}
        onCancel={() => { setErogazioneVisible(false); formErogazione.resetFields(); }}
        onOk={() => formErogazione.submit()}
        okText="Registra"
        cancelText="Annulla"
        confirmLoading={registraErogazione.isPending}
        width={400}
      >
        <Form form={formErogazione} layout="vertical" style={{ marginTop: 16 }}
          onFinish={(v) => registraErogazione.mutate(v)}>
          <Form.Item name="importo_erogato" label="Importo erogato (€)"
            rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="data_erogazione" label="Data erogazione"
            rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
