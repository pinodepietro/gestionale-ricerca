import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography, Button, Space, Descriptions, Tag, Table, Card, Modal, Form,
  Input, Select, Row, Col, Statistic, message, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined,
  SwapOutlined, FileAddOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposteApi } from '../../api/proposte';
import { configApi } from '../../api/config';
import { useAuthStore } from '../../store/useAuthStore';
import { canDo } from '../../utils/rbac';
import { formatData } from '../../utils/formatters';
import type { StatoProposta } from '../../types/proposta';

const { Title, Text } = Typography;

const importoFormatter = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtImporto = (v: number | null | undefined): string =>
  v != null ? importoFormatter.format(v) : '—';

const STATI: { value: StatoProposta; label: string; color: string }[] = [
  { value: 'in_preparazione', label: 'In preparazione', color: 'default' },
  { value: 'sottomessa',      label: 'Sottomessa',      color: 'blue' },
  { value: 'approvata',       label: 'Approvata',       color: 'green' },
  { value: 'rigettata',       label: 'Rigettata',       color: 'red' },
];

function StatoTag({ stato }: { stato: StatoProposta }) {
  const s = STATI.find(s => s.value === stato);
  return <Tag color={s?.color ?? 'default'} style={{ fontSize: 13, padding: '2px 10px' }}>{s?.label ?? stato}</Tag>;
}

export function PropostaDettaglioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);

  const [modalStato, setModalStato] = useState(false);
  const [nuovoStato, setNuovoStato] = useState<StatoProposta | undefined>();
  const [modalConverti, setModalConverti] = useState(false);
  const [formConverti] = Form.useForm();


  const { data: proposta, isLoading } = useQuery({
    queryKey: ['proposta', id],
    queryFn: () => proposteApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: tipiProgetto } = useQuery({
    queryKey: ['config', 'tipi-progetto'],
    queryFn: () => configApi.tipiProgetto().then(r => r.data.data),
  });

  const { mutate: cambiaStato, isPending: cambiandoStato } = useMutation({
    mutationFn: (stato: StatoProposta) => proposteApi.update(id!, { stato }).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposta', id] });
      queryClient.invalidateQueries({ queryKey: ['proposte'] });
      setModalStato(false);
      message.success('Stato aggiornato');
    },
    onError: () => message.error('Errore nel cambio stato'),
  });

  const { mutate: elimina, isPending: eliminando } = useMutation({
    mutationFn: () => proposteApi.delete(id!).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposte'] });
      navigate('/proposte');
      message.success('Proposta eliminata');
    },
    onError: () => message.error('Errore nella cancellazione'),
  });

  const { mutate: converti, isPending: convertendo } = useMutation({
    mutationFn: (values: { codice: string; tipo: string; data_fine?: string }) =>
      proposteApi.converti(id!, values).then(r => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposta', id] });
      queryClient.invalidateQueries({ queryKey: ['proposte'] });
      queryClient.invalidateQueries({ queryKey: ['progetti'] });
      setModalConverti(false);
      message.success(`Progetto "${data.codice}" creato in bozza`);
      navigate(`/progetti/${data.progetto_id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message;
      message.error(msg ?? 'Errore nella conversione');
    },
  });

  if (isLoading || !proposta) return null;

  const isOwner = proposta.created_by === user?.id;
  const isSuperAdmin = user?.ruolo === 'superadmin';
  const puoModificare = user && (isOwner || isSuperAdmin) && proposta.stato !== 'approvata';
  const puoEliminare = user && (isOwner || isSuperAdmin);
  const puoConvertire = user && canDo(user.ruolo, 'proposta:converti') && proposta.stato !== 'approvata';

  const percOverhead = proposta.costo_totale && proposta.importo_overhead && proposta.costo_totale > 0
    ? ((proposta.importo_overhead / proposta.costo_totale) * 100).toFixed(2)
    : null;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/proposte')}>Indietro</Button>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                [{proposta.acronimo}] {proposta.titolo}
              </Title>
              <Space style={{ marginTop: 4 }}>
                <StatoTag stato={proposta.stato} />
                {proposta.responsabile_scientifico && (
                  <Text type="secondary">
                    PI: {proposta.responsabile_scientifico.cognome} {proposta.responsabile_scientifico.nome}
                    {proposta.responsabile_scientifico.ssd && ` — ${proposta.responsabile_scientifico.ssd}`}
                  </Text>
                )}
              </Space>
            </div>
          </Space>
        </Col>
        <Col>
          <Space>
            {puoModificare && (
              <Button icon={<EditOutlined />} onClick={() => navigate(`/proposte/${id}/modifica`)}>
                Modifica
              </Button>
            )}
            <Button icon={<SwapOutlined />} onClick={() => setModalStato(true)}>
              Cambia stato
            </Button>
            {puoConvertire && (
              <Button type="primary" icon={<FileAddOutlined />} onClick={() => setModalConverti(true)}>
                Converti in progetto
              </Button>
            )}
            {puoEliminare && (
              <Popconfirm
                title="Eliminare questa proposta?"
                onConfirm={() => elimina()}
                okText="Elimina" okType="danger"
                cancelText="Annulla"
              >
                <Button danger icon={<DeleteOutlined />} loading={eliminando} />
              </Popconfirm>
            )}
          </Space>
        </Col>
      </Row>

      {/* Anagrafica */}
      <Card title="Anagrafica" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Acronimo">{proposta.acronimo}</Descriptions.Item>
          <Descriptions.Item label="Titolo">{proposta.titolo}</Descriptions.Item>
          <Descriptions.Item label="Bando / Programma / Call" span={2}>{proposta.bando}</Descriptions.Item>
          <Descriptions.Item label="Scadenza bando">
            {proposta.data_scadenza_bando ? formatData(proposta.data_scadenza_bando) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Data inizio prevista">
            {proposta.data_inizio_prevista ? formatData(proposta.data_inizio_prevista) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Durata">
            {proposta.durata_mesi ? `${proposta.durata_mesi} mesi` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="SSD responsabile">
            {proposta.responsabile_scientifico?.ssd ?? '—'}
          </Descriptions.Item>
          {proposta.descrizione && (
            <Descriptions.Item label="Descrizione" span={2}>{proposta.descrizione}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Budget */}
      <Card title="Prospetto budget UniPegaso" style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic title="A — Costo totale" value={proposta.costo_totale ?? '—'}
              formatter={v => fmtImporto(typeof v === 'number' ? v : null)} />
          </Col>
          <Col span={8}>
            <Statistic title="B — Importo finanziato (fondo perduto)" value={proposta.importo_finanziato ?? '—'}
              formatter={v => fmtImporto(typeof v === 'number' ? v : null)} />
          </Col>
          <Col span={8}>
            <Statistic title="C — Importo Cofinanziato (mediante ore/persona)" value={proposta.importo_cofinanziato ?? '—'}
              formatter={v => fmtImporto(typeof v === 'number' ? v : null)} />
          </Col>
          <Col span={8} style={{ marginTop: 24 }}>
            <Statistic title="E — Spese generali / overhead" value={proposta.importo_overhead ?? '—'}
              formatter={v => fmtImporto(typeof v === 'number' ? v : null)} />
          </Col>
          {percOverhead && (
            <Col span={8} style={{ marginTop: 24 }}>
              <Statistic title="% overhead su costo totale" value={percOverhead} suffix="%" />
            </Col>
          )}
        </Row>
      </Card>

      {/* Partner */}
      <Card title="Partner / Enti coinvolti" style={{ marginBottom: 16 }}>
        {proposta.partner && proposta.partner.length > 0 ? (
          <Table
            dataSource={proposta.partner}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              { title: 'Denominazione', dataIndex: 'denominazione', ellipsis: true },
              { title: 'Tipologia', dataIndex: 'tipologia', width: 160 },
              { title: 'Ruolo', dataIndex: 'ruolo', width: 160,
                render: (v: string) => v === 'capofila' ? 'Capofila / Leader Partner' : 'Partner' },
              { title: 'Nazionalità', dataIndex: 'nazionalita', width: 110 },
              { title: 'Sito web', dataIndex: 'sito_web', ellipsis: true,
                render: (v: string) => v ? <a href={v} target="_blank" rel="noreferrer">{v}</a> : '—' },
            ]}
          />
        ) : (
          <Text type="secondary">Nessun partner — proposta UniPegaso in solitaria.</Text>
        )}
      </Card>

      {/* Modal cambio stato */}
      <Modal
        open={modalStato}
        title="Cambia stato proposta"
        onCancel={() => setModalStato(false)}
        onOk={() => nuovoStato && cambiaStato(nuovoStato)}
        confirmLoading={cambiandoStato}
        okText="Conferma" cancelText="Annulla"
        okButtonProps={{ disabled: !nuovoStato || nuovoStato === proposta.stato }}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Nuovo stato">
            <Select
              value={nuovoStato}
              onChange={setNuovoStato}
              options={STATI.map(s => ({ value: s.value, label: s.label }))}
              placeholder="Seleziona stato"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal converti in progetto */}
      <Modal
        open={modalConverti}
        title="Converti in progetto"
        onCancel={() => setModalConverti(false)}
        onOk={() => formConverti.submit()}
        confirmLoading={convertendo}
        okText="Crea progetto in bozza"
        cancelText="Annulla"
        width={520}
      >
        <p style={{ color: '#666', marginBottom: 16 }}>
          Verrà creato un progetto in stato <strong>bozza</strong> pre-compilato con i dati della proposta.
          Potrai completare i dati mancanti nella scheda progetto.
        </p>
        <Form form={formConverti} layout="vertical" onFinish={converti}>
          <Form.Item name="codice" label="Codice progetto" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input placeholder="es. PRIN2022-001" />
          </Form.Item>
          <Form.Item name="tipo" label="Tipo progetto" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Select
              options={(tipiProgetto ?? []).map((t: { id: string; nome: string }) => ({ value: t.nome, label: t.nome }))}
              placeholder="Seleziona tipo"
            />
          </Form.Item>
          {!proposta.data_inizio_prevista && (
            <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true, message: 'Obbligatorio' }]}>
              <Input type="date" />
            </Form.Item>
          )}
          {!proposta.durata_mesi && (
            <Form.Item name="data_fine" label="Data fine" rules={[{ required: true, message: 'Obbligatorio' }]}>
              <Input type="date" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
