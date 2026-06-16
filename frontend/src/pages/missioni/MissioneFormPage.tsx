import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, Select, DatePicker, TimePicker, InputNumber, Button,
  Typography, Row, Col, Card, message, Spin, Space, Tabs,
  Radio, Alert, Descriptions,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { missioniApi, type Missione } from '../../api/missioni';
import { progettiApi } from '../../api/progetti';
import { personaleApi } from '../../api/personale';
import { useAuthStore } from '../../store/useAuthStore';
import { apiErrorMessage } from '../../utils/apiError';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const COPERTURA_OPTIONS = [
  { value: 'progetto',     label: 'Progetto finanziato' },
  { value: 'strategico',   label: 'Progetto strategico di Ateneo' },
  { value: 'altro',        label: 'Altro' },
];

const VOCE_OPTIONS = [
  { value: 'missioni', label: 'D.1/D.2 — Missioni e trasferte / Convegni' },
  { value: 'overhead', label: 'E.1 — Overhead' },
];

const GRUPPO_LABEL: Record<string, string> = {
  A: 'Gruppo A — Professore/Professoressa di I e II Fascia; membro di organi o commissioni costituite dal Rettore/Senato Accademico; membro di commissioni giudicatrici',
  B: 'Gruppo B — Ricercatore/Ricercatrice (a tempo determinato o indeterminato)',
  C: 'Gruppo C — Docente a contratto; titolare di assegni/borse/contratti di collaborazione; dottorando/a; specializzando; Tutor',
};

interface FormValues {
  progetto_id: string;
  titolo: string;
  destinazione: string;
  motivo: string;
  data_inizio: dayjs.Dayjs;
  data_fine: dayjs.Dayjs;
  ora_inizio?: dayjs.Dayjs;
  ora_fine?: dayjs.Dayjs;
  copertura_tipo: string;
  copertura_descrizione?: string;
  mezzo_tipo: string;
  mezzo_descrizione?: string;
  auto_alimentazione?: string;
  auto_cilindrata?: string;
  motivazione_mezzo_straordinario?: string;
  importo_stimato?: number;
  voce_impegno?: string;
}

export function MissioneFormPage() {
  const { id } = useParams<{ id: string }>();
  const isModifica = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [form] = Form.useForm<FormValues>();
  const mezzoTipo = Form.useWatch('mezzo_tipo', form);

  const { data: missione, isLoading: loadingMissione } = useQuery({
    queryKey: ['missione', id],
    queryFn: () => missioniApi.get(id!).then(r => r.data.data),
    enabled: isModifica,
  });

  const { data: myPersona } = useQuery({
    queryKey: ['persona', user?.id],
    queryFn: () => personaleApi.get(user!.id).then(r => r.data.data),
    enabled: !!user?.id && !isModifica,
  });

  const { data: progettiResp } = useQuery({
    queryKey: ['progetti', 'form-missione'],
    queryFn: () => progettiApi.list({ solo_allocati: true, page_size: 100 }).then(r => r.data),
  });
  const progetti = progettiResp?.data ?? [];

  useEffect(() => {
    if (missione) {
      form.setFieldsValue({
        ...missione,
        data_inizio: missione.data_inizio ? dayjs(missione.data_inizio) : undefined,
        data_fine: missione.data_fine ? dayjs(missione.data_fine) : undefined,
        ora_inizio: missione.ora_inizio ? dayjs(missione.ora_inizio, 'HH:mm') : undefined,
        ora_fine: missione.ora_fine ? dayjs(missione.ora_fine, 'HH:mm') : undefined,
      });
    }
  }, [missione, form]);

  const crea = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      missioniApi.create(values as Partial<Missione>).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['missioni'] });
      message.success('Missione creata');
      navigate(`/missioni/${data.data.id}`);
    },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nella creazione')),
  });

  const aggiorna = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      missioniApi.update(id!, values as Partial<Missione>).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missione', id] });
      queryClient.invalidateQueries({ queryKey: ['missioni'] });
      message.success('Missione aggiornata');
      navigate(`/missioni/${id}`);
    },
    onError: (e: unknown) => message.error(apiErrorMessage(e, 'Errore nel salvataggio')),
  });

  const onFinish = (values: FormValues) => {
    const payload: Record<string, unknown> = {
      ...values,
      data_inizio: values.data_inizio?.format('YYYY-MM-DD'),
      data_fine: values.data_fine?.format('YYYY-MM-DD'),
      ora_inizio: values.ora_inizio?.format('HH:mm') ?? null,
      ora_fine: values.ora_fine?.format('HH:mm') ?? null,
    };
    if (isModifica) aggiorna.mutate(payload);
    else crea.mutate(payload);
  };

  if (isModifica && loadingMissione) return <Spin />;

  const isMutating = crea.isPending || aggiorna.isPending;
  const isStrordinario = mezzoTipo === 'straordinario';

  const gruppo = isModifica ? missione?.gruppo_missione : myPersona?.gruppo_missione;

  // ── Tab 1: Form ──────────────────────────────────────────────────────────────
  const formContent = (
    <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">

      {/* Gruppo richiedente — solo lettura */}
      {gruppo ? (
        <Alert
          type="info"
          showIcon
          message={`Richiedente: ${GRUPPO_LABEL[gruppo] ?? `Gruppo ${gruppo}`}`}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Alert
          type="warning"
          showIcon
          message="Gruppo non impostato"
          description="Il gruppo (A, B o C) non risulta configurato nella tua scheda anagrafica. Contatta l'amministrazione per impostarlo prima di inviare la richiesta."
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title="Dati generali" style={{ marginBottom: 16 }}>
        <Form.Item name="progetto_id" label="Progetto" rules={[{ required: true }]}>
          <Select
            showSearch
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={progetti.map(p => ({
              value: p.id,
              label: p.codice ? `${p.codice} — ${p.titolo}` : p.titolo,
            }))}
            placeholder={progetti.length === 0 ? 'Nessun progetto trovato' : 'Seleziona progetto'}
            notFoundContent={
              <Text type="secondary">Nessun progetto: verifica di essere allocato su almeno un progetto</Text>
            }
          />
        </Form.Item>

        <Form.Item name="titolo" label="Titolo missione" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="destinazione" label="Destinazione" rules={[{ required: true }]}>
          <Input placeholder="es. Madeira (Portogallo)" />
        </Form.Item>

        <Form.Item name="motivo" label="Motivo / Oggetto" rules={[{ required: true }]}>
          <TextArea rows={3} placeholder="es. Partecipazione a meeting di progetto" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="data_fine"
              label="Data fine"
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const inizio = getFieldValue('data_inizio');
                    if (!value || !inizio) return Promise.resolve();
                    if (value.isBefore(inizio, 'day'))
                      return Promise.reject(new Error('La data di fine non può essere precedente alla data di inizio'));
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="ora_inizio" label="Ora di partenza">
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={15}
                placeholder="es. 07:00" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ora_fine" label="Ora di rientro">
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={15}
                placeholder="es. 20:00" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Mezzo di trasporto" style={{ marginBottom: 16 }}>
        <Form.Item name="mezzo_tipo" label="Tipologia mezzo" rules={[{ required: true }]}>
          <Radio.Group>
            <Space direction="vertical">
              <Radio value="ordinario">
                <Text strong>Mezzo ordinario</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  es. treno, aereo, nave, servizi automobilistici, proprio veicolo
                </Text>
              </Radio>
              <Radio value="straordinario">
                <Text strong>Mezzo straordinario</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  es. mezzi noleggiati, taxi urbani ed extraurbani (richiede motivazione)
                </Text>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="mezzo_descrizione" label="Specifica mezzo">
          <Input placeholder="es. Volo Napoli–Lisbona, Frecciarossa, auto propria…" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="auto_alimentazione" label="Alimentazione auto (se veicolo proprio)">
              <Input placeholder="es. benzina, diesel, elettrica" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="auto_cilindrata" label="Cilindrata auto">
              <Input placeholder="es. 1600 cc" />
            </Form.Item>
          </Col>
        </Row>

        {isStrordinario && (
          <Form.Item
            name="motivazione_mezzo_straordinario"
            label="Motivazione uso mezzo straordinario"
            rules={[{ required: true, message: 'Obbligatorio per mezzo straordinario' }]}
          >
            <TextArea rows={3}
              placeholder="Indicare una delle condizioni previste dal regolamento: convenienza economica, luogo non raggiungibile con mezzi ordinari, urgenza, ecc." />
          </Form.Item>
        )}
      </Card>

      <Card title="Copertura finanziaria e budget" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="copertura_tipo" label="Tipo copertura" rules={[{ required: true }]}>
              <Select options={COPERTURA_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="copertura_descrizione" label="Specificare (se necessario)">
              <Input placeholder="es. nome e codice progetto" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="importo_stimato" label="Importo stimato (€)" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: '100%' }} min={0} precision={2}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={v => parseFloat(v?.replace(/\./g, '').replace(',', '.') ?? '0') as 0}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="voce_impegno" label="Voce di costo">
              <Select options={VOCE_OPTIONS} placeholder="Missioni (default)" allowClear />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Space>
        <Button type="primary" htmlType="submit" loading={isMutating}>
          {isModifica ? 'Salva modifiche' : 'Crea missione'}
        </Button>
        <Button onClick={() => navigate(isModifica ? `/missioni/${id}` : '/missioni')}>
          Annulla
        </Button>
      </Space>
    </Form>
  );

  // ── Tab 2: Regolamento ───────────────────────────────────────────────────────
  const regolamentoContent = (
    <div style={{ maxWidth: 720, lineHeight: 1.7 }}>
      <Title level={4}>Regolamento missioni e trasferte — Personale Docente</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Estratto dal Regolamento per il trattamento economico del rimborso delle spese di missione e di trasferta per il personale docente. Il testo ha valore informativo; in caso di dubbio fare riferimento al documento ufficiale.
      </Text>

      <Card title="Gruppi del personale" size="small" style={{ marginBottom: 12 }}>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Gruppo A">
            Professore/Professoressa di I e II Fascia; membro di organi o commissioni costituite dal Rettore, dal Senato Accademico e membro di commissioni giudicatrici di concorso o di studio.
          </Descriptions.Item>
          <Descriptions.Item label="Gruppo B">
            Ricercatore/Ricercatrice sia a tempo determinato che indeterminato.
          </Descriptions.Item>
          <Descriptions.Item label="Gruppo C">
            Docente a contratto; titolare di assegni e borse di ricerca, contratti di collaborazione, dottorando/a di ricerca e specializzando; Tutor.
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Mezzo di trasporto" size="small" style={{ marginBottom: 12 }}>
        <Paragraph>
          <Text strong>Mezzo ordinario:</Text> treno, aereo, nave, servizi automobilistici, proprio veicolo, ecc.
          In caso di veicolo proprio indicare alimentazione e cilindrata.
        </Paragraph>
        <Paragraph>
          <Text strong>Mezzo straordinario:</Text> mezzi noleggiati, taxi urbani ed extraurbani.
          Il noleggio di veicoli, l'utilizzo dell'aereo per missioni sul territorio nazionale e delle navi deve essere sempre preventivamente autorizzato e proposto quando si verifichi almeno una delle seguenti condizioni:
        </Paragraph>
        <ul style={{ paddingLeft: 20 }}>
          <li><Text strong>Convenienza economica:</Text> la soluzione straordinaria è più economica rispetto alle spese con mezzi ordinari sommate a vitto e alloggio.</li>
          <li>Il luogo di destinazione non è servito da ferrovia né da altri mezzi ordinari di linea.</li>
          <li>Necessità di raggiungere rapidamente il luogo della missione per motivi di opportunità nell'interesse dell'Università.</li>
          <li>Esigenza di trasportare materiali, strumenti e documentazione voluminosa che richiedono mezzi straordinari.</li>
          <li>Sciopero dei mezzi pubblici o altre ipotesi eccezionali adeguatamente motivate.</li>
        </ul>
      </Card>

      <Card title="Uso del taxi" size="small" style={{ marginBottom: 12 }}>
        <Paragraph>Il taxi è previsto esclusivamente per:</Paragraph>
        <ul style={{ paddingLeft: 20 }}>
          <li>Trasferimento da casa/ufficio verso l'aeroporto/stazione e viceversa.</li>
          <li>Raggiungimento della sede di lavoro nella località di destinazione.</li>
          <li>Raggiungimento dell'aeroporto/stazione per il rientro dalla trasferta.</li>
          <li>Tragitti urbani ed extraurbani non serviti da mezzi pubblici.</li>
          <li>Partenze e rientri in orari in cui non è possibile l'utilizzo di mezzi alternativi.</li>
        </ul>
        <Paragraph>Tutte le spese di taxi devono essere giustificate mediante ricevuta con indicazione del percorso, dell'importo, della data e della firma.</Paragraph>
      </Card>

      <Card title="Iscrizioni a congressi e convegni" size="small" style={{ marginBottom: 12 }}>
        <Paragraph>
          Qualora la quota di iscrizione sia comprensiva del vitto e/o dell'alloggio, e non sia possibile differenziare gli importi neanche attraverso attestazione dell'Ente organizzatore, l'interessato dovrà dichiarare ai fini della liquidazione il numero dei pasti e/o dei pernottamenti fruiti.
        </Paragraph>
        <Paragraph>
          Le spese di iscrizione possono essere gestite e pagate dalla Struttura competente direttamente all'Ente organizzatore.
        </Paragraph>
      </Card>

      <Card title="Progetti finanziati" size="small" style={{ marginBottom: 12 }}>
        <Paragraph>
          Per missioni spesate e rendicontate su progetti finanziati che prevedono limiti differenti, i contenuti del regolamento vengono integrati dagli eventuali diversi criteri previsti negli accordi con il soggetto finanziatore.
        </Paragraph>
        <Paragraph>
          Nel caso di progetto finanziato, <Text strong>l'autorizzazione del Direttore di Dipartimento è subordinata al preventivo nulla osta del Principal Investigator</Text>, in ordine alla legittimità della missione.
        </Paragraph>
      </Card>

      <Card title="Importo stimato" size="small">
        <Paragraph>
          L'importo stimato è richiesto <Text strong>a titolo previsionale</Text> e non costituisce vincolo alla spesa.
          Tale importo non potrà in alcun caso essere superiore alla capienza complessiva della voce di spesa su cui è caricato.
        </Paragraph>
      </Card>
    </div>
  );

  return (
    <div style={{ maxWidth: 800 }}>
      <Button icon={<ArrowLeftOutlined />} type="link" style={{ marginBottom: 8, paddingLeft: 0 }}
        onClick={() => navigate(isModifica ? `/missioni/${id}` : '/missioni')}>
        Indietro
      </Button>
      <Title level={3} style={{ marginTop: 0 }}>
        {isModifica ? 'Modifica missione' : 'Nuova missione'}
      </Title>

      <Tabs
        items={[
          { key: 'form', label: 'Dati missione', children: formContent },
          { key: 'reg', label: 'Note regolamentari', children: regolamentoContent },
        ]}
      />
    </div>
  );
}
