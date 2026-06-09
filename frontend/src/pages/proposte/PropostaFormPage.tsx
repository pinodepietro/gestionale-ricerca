import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, InputNumber, DatePicker, Button, Typography, Row, Col,
  Space, Table, Modal, Select, Divider, message,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { proposteApi } from '../../api/proposte';
import { personaleApi } from '../../api/personale';
import { useAuthStore } from '../../store/useAuthStore';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import type { PropostaPartner } from '../../types/proposta';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TIPOLOGIE_ENTE = [
  'Università', 'Ente di ricerca', 'Società', 'Impresa', 'No profit', 'Ente pubblico', 'Altro',
];
const RUOLI_PARTNER = [
  { value: 'capofila', label: 'Capofila / Leader Partner' },
  { value: 'partner', label: 'Partner' },
];

// Formato italiano: punto migliaia, virgola decimale, nessun simbolo €
const euroFormatter = (v: number | string | undefined): string => {
  if (v === undefined || v === '') return '';
  const [intPart, decPart] = String(v).split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
};
const euroParser = (v: string | undefined): number =>
  parseFloat((v || '').replace(/\./g, '').replace(',', '.')) || 0;

export function PropostaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const user = useAuthStore(s => s.user);

  const { data: profilo } = useQuery({
    queryKey: ['persona', user?.id],
    queryFn: () => personaleApi.get(user!.id).then(r => r.data.data),
    enabled: !!user?.id,
  });
  const [form] = Form.useForm();
  const [formPartner] = Form.useForm();
  const [partnerModal, setPartnerModal] = useState(false);
  const [partnerInModifica, setPartnerInModifica] = useState<PropostaPartner | null>(null);
  const [confirmDeletePartner, setConfirmDeletePartner] = useState<string | null>(null);
  const [costoTotale, setCostoTotale] = useState<number | null>(null);
  const [importoFinanziato, setImportoFinanziato] = useState<number | null>(null);
  const [importoOverhead, setImportoOverhead] = useState<number | null>(null);

  const { data: proposta, isLoading } = useQuery({
    queryKey: ['proposta', id],
    queryFn: () => proposteApi.get(id!).then(r => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (proposta) {
      form.setFieldsValue({
        ...proposta,
        data_scadenza_bando: proposta.data_scadenza_bando ? dayjs(proposta.data_scadenza_bando) : null,
        data_inizio_prevista: proposta.data_inizio_prevista ? dayjs(proposta.data_inizio_prevista) : null,
      });
      setCostoTotale(proposta.costo_totale ?? null);
      setImportoFinanziato(proposta.importo_finanziato ?? null);
      setImportoOverhead(proposta.importo_overhead ?? null);
    }
  }, [proposta, form]);

  // C calcolato automaticamente: A − B
  const cofinanziato =
    costoTotale !== null && importoFinanziato !== null
      ? Math.max(0, costoTotale - importoFinanziato)
      : null;

  const { mutate: salva, isPending: salvando } = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        importo_cofinanziato: cofinanziato ?? 0,
        data_scadenza_bando: values.data_scadenza_bando
          ? (values.data_scadenza_bando as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        data_inizio_prevista: values.data_inizio_prevista
          ? (values.data_inizio_prevista as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      };
      return isEdit
        ? proposteApi.update(id!, payload).then(r => r.data.data)
        : proposteApi.create(payload).then(r => r.data.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposte'] });
      queryClient.invalidateQueries({ queryKey: ['proposta', id] });
      message.success(isEdit ? 'Proposta aggiornata' : 'Proposta creata');
      navigate(`/proposte/${data.id}`);
    },
    onError: () => message.error('Errore nel salvataggio'),
  });

  function handleFinish(values: Record<string, unknown>) {
    const totale = (values.costo_totale as number) || 0;
    const overhead = (values.importo_overhead as number) || 0;
    if (totale > 0 && overhead > totale) {
      message.error('Le spese generali (E) non possono essere maggiori del costo totale del progetto (A)');
      return;
    }
    salva(values);
  }

  const { mutate: salvaNuovoPartner, isPending: salvandoPartner } = useMutation({
    mutationFn: (values: Partial<PropostaPartner>) => {
      if (partnerInModifica) {
        return proposteApi.aggiornaPartner(id!, partnerInModifica.id, values).then(r => r.data.data);
      }
      return proposteApi.aggiungiPartner(id!, values).then(r => r.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposta', id] });
      chiudiModalPartner();
    },
    onError: () => message.error('Errore nel salvataggio del partner'),
  });

  const { mutate: eliminaPartner, isPending: eliminandoPartner } = useMutation({
    mutationFn: (partnerId: string) => proposteApi.eliminaPartner(id!, partnerId).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposta', id] });
      setConfirmDeletePartner(null);
    },
  });

  function chiudiModalPartner() {
    setPartnerModal(false);
    setPartnerInModifica(null);
    formPartner.resetFields();
  }

  function apriModificaPartner(pp: PropostaPartner) {
    setPartnerInModifica(pp);
    formPartner.setFieldsValue(pp);
    setPartnerModal(true);
  }

  const percOverhead = costoTotale && importoOverhead && costoTotale > 0
    ? ((importoOverhead / costoTotale) * 100).toFixed(2)
    : null;

  const colonnePartner = [
    { title: 'Denominazione', dataIndex: 'denominazione', ellipsis: true },
    { title: 'Tipologia', dataIndex: 'tipologia', width: 150 },
    { title: 'Ruolo', dataIndex: 'ruolo', width: 180,
      render: (v: string) => RUOLI_PARTNER.find(r => r.value === v)?.label ?? v },
    { title: 'Nazionalità', dataIndex: 'nazionalita', width: 110 },
    { title: 'Sito web', dataIndex: 'sito_web', ellipsis: true,
      render: (v: string) => v ? <a href={v} target="_blank" rel="noreferrer">{v}</a> : '—' },
    {
      title: '', width: 80,
      render: (_: unknown, r: PropostaPartner) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" type="text" onClick={() => apriModificaPartner(r)} />
          <Button icon={<DeleteOutlined />} size="small" type="text" danger onClick={() => setConfirmDeletePartner(r.id)} />
        </Space>
      ),
    },
  ];

  if (isEdit && isLoading) return null;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEdit ? `/proposte/${id}` : '/proposte')}>
              Indietro
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {isEdit ? 'Modifica proposta' : 'Nuova proposta di progetto'}
            </Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button onClick={() => navigate(isEdit ? `/proposte/${id}` : '/proposte')}>Annulla</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={salvando} onClick={() => form.submit()}>
              {isEdit ? 'Salva modifiche' : 'Crea proposta'}
            </Button>
          </Space>
        </Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={handleFinish}>

        {/* ── Dati generali ── */}
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Dati generali</Text>

          {/* Responsabile scientifico — read only, è l'utente corrente */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>Responsabile scientifico (PI)</Text>
              <div style={{
                padding: '4px 11px', background: '#f5f5f5', border: '1px solid #d9d9d9',
                borderRadius: 6, minHeight: 32, lineHeight: '22px', marginTop: 4,
              }}>
                {profilo ? `${profilo.cognome} ${profilo.nome}` : `${user?.cognome} ${user?.nome}`}
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>SSD (Settore Scientifico Disciplinare)</Text>
              <div style={{
                padding: '4px 11px', background: '#f5f5f5', border: '1px solid #d9d9d9',
                borderRadius: 6, minHeight: 32, lineHeight: '22px', marginTop: 4,
                color: profilo?.ssd ? '#000' : '#bbb',
              }}>
                {profilo?.ssd || 'Non impostato — aggiornabile nella sezione Personale'}
              </div>
            </Col>
          </Row>

          <Form.Item name="titolo" label="Titolo progetto" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="acronimo" label="Acronimo (opzionale)">
                <Input maxLength={30} placeholder="es. MYPROJ" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="data_scadenza_bando" label="Scadenza bando" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="data_inizio_prevista" label="Inizio previsto">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="durata_mesi" label="Durata (mesi)">
                <InputNumber min={1} max={120} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="bando" label="Bando / Programma / Call / Grant" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input placeholder="es. PRIN 2022, Horizon Europe RIA, PON Ricerca e Innovazione..." />
          </Form.Item>

          <Form.Item name="descrizione" label="Breve descrizione — obiettivi e finalità (max 500 caratteri)">
            <TextArea rows={4} maxLength={500} showCount />
          </Form.Item>
        </div>

        {/* ── Budget ── */}
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Prospetto budget UniPegaso</Text>

          {/* A — Costo totale */}
          <Form.Item name="costo_totale" label="A — Costo totale progetto (€)"
            help="Importo totale comprensivo di eventuale cofinanziamento" style={{ marginBottom: 20 }}>
            <InputNumber
              min={0} style={{ width: '100%' }} precision={2} size="large"
              formatter={euroFormatter} parser={euroParser}
              onChange={v => setCostoTotale(v as number | null)}
            />
          </Form.Item>

          <Divider dashed style={{ margin: '0 0 20px' }} />

          {/* B editabile + C calcolata */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="importo_finanziato"
                label="B — Importo finanziato a fondo perduto (€)"
                help="Contributo erogato a fondo perduto">
                <InputNumber
                  min={0} style={{ width: '100%' }} precision={2}
                  formatter={euroFormatter} parser={euroParser}
                  onChange={v => setImportoFinanziato(v as number | null)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="C — Importo Cofinanziato (mediante ore/persona) (€)"
                help="Calcolato automaticamente: A − B">
                <div style={{
                  padding: '4px 11px', background: '#f5f5f5', border: '1px solid #d9d9d9',
                  borderRadius: 6, minHeight: 32, lineHeight: '22px', color: '#595959',
                }}>
                  {cofinanziato !== null
                    ? `${cofinanziato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                    : '—'}
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Divider dashed style={{ margin: '0 0 20px' }} />

          {/* E — Overhead */}
          <Row gutter={16} align="bottom">
            <Col span={12}>
              <Form.Item name="importo_overhead"
                label="E — Spese generali / overhead (€)"
                help="Importo stimato a titolo di overhead">
                <InputNumber
                  min={0} style={{ width: '100%' }} precision={2}
                  formatter={euroFormatter} parser={euroParser}
                  onChange={v => setImportoOverhead(v as number | null)}
                />
              </Form.Item>
            </Col>
            {percOverhead !== null && (
              <Col span={6}>
                <Form.Item label="% overhead su A">
                  <div style={{
                    height: 32, lineHeight: '32px', paddingLeft: 11,
                    background: '#f5f5f5', borderRadius: 6, fontWeight: 600,
                  }}>
                    {percOverhead}%
                  </div>
                </Form.Item>
              </Col>
            )}
          </Row>
        </div>

        {/* ── Partner (solo modifica) ── */}
        {isEdit && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Text strong style={{ fontSize: 15 }}>Partner / Enti coinvolti</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>Da compilare solo in caso di partner oltre UniPegaso</Text>
              </Col>
              <Col>
                <Button icon={<PlusOutlined />} onClick={() => setPartnerModal(true)}>
                  Aggiungi partner
                </Button>
              </Col>
            </Row>
            {proposta?.partner && proposta.partner.length > 0 ? (
              <Table
                columns={colonnePartner}
                dataSource={proposta.partner}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Text type="secondary">Nessun partner aggiunto.</Text>
            )}
          </div>
        )}
      </Form>

      {/* Modal partner */}
      <Modal
        open={partnerModal}
        title={partnerInModifica ? 'Modifica partner' : 'Aggiungi partner'}
        onCancel={chiudiModalPartner}
        onOk={() => formPartner.submit()}
        confirmLoading={salvandoPartner}
        okText="Salva" cancelText="Annulla"
        width={600}
      >
        <Form form={formPartner} layout="vertical" onFinish={salvaNuovoPartner} style={{ marginTop: 16 }}>
          <Form.Item name="denominazione" label="Denominazione" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input placeholder="Nome dell'ente" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tipologia" label="Tipologia ente" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <Select options={TIPOLOGIE_ENTE.map(t => ({ value: t, label: t }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ruolo" label="Ruolo nel progetto" rules={[{ required: true }]} initialValue="partner">
                <Select options={RUOLI_PARTNER} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nazionalita" label="Nazionalità">
                <Input placeholder="es. Italiana, Tedesca..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sito_web" label="Sito web">
                <Input placeholder="https://..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <ConfirmModal
        open={!!confirmDeletePartner}
        title="Elimina partner"
        content="Sei sicuro di voler eliminare questo partner?"
        okText="Elimina" okDanger
        confirmLoading={eliminandoPartner}
        onConfirm={() => confirmDeletePartner && eliminaPartner(confirmDeletePartner)}
        onCancel={() => setConfirmDeletePartner(null)}
      />
    </div>
  );
}
