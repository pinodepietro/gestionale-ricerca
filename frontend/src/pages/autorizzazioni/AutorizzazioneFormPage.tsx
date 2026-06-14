import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, InputNumber, DatePicker, Button, Typography, Row, Col,
  Select, Radio, Upload, Alert, Space, Divider, message,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { autorizzazioniApi, dipartimentiApi } from '../../api/autorizzazioni';
import { progettiApi } from '../../api/progetti';
import { personaleApi } from '../../api/personale';
import { useAuthStore } from '../../store/useAuthStore';
import type { Allocazione } from '../../types/personale';

const { Title, Text } = Typography;
const { TextArea } = Input;

const MACROCATEGORIE = [
  { value: 'personale',           label: 'Macrocategoria Personale' },
  { value: 'spese_generali',      label: 'Macrocategoria Spese Generali' },
  { value: 'consulenze_servizi',  label: 'Macrocategoria Acquisizione Consulenze e/o Servizi' },
  { value: 'strumentazioni',      label: 'Macrocategoria Strumentazioni e Attrezzature' },
];

const VOCI_PER_MACRO: Record<string, { value: string; label: string }[]> = {
  personale: [
    { value: 'a', label: 'a) Contratti di Ricerca' },
    { value: 'b', label: 'b) RTDA' },
    { value: 'c', label: 'c) RTD o forme analoghe' },
    { value: 'd', label: 'd) Assegni di ricerca' },
    { value: 'e', label: 'e) Borse di ricerca' },
    { value: 'f', label: 'f) Co.Co.Co/Co.Co.Pro' },
    { value: 'g', label: 'g) Incentivazione Personale Docente' },
    { value: 'h', label: 'h) Altro (specificare)' },
  ],
  spese_generali: [
    { value: 'i', label: 'i) Consulenze' },
    { value: 'j', label: 'j) Prestazioni Professionali' },
    { value: 'k', label: 'k) Contratti di edizione per articoli e libri (Pubblicazioni)' },
    { value: 'l', label: 'l) Materiali di consumo' },
    { value: 'm', label: 'm) Altro (specificare)' },
  ],
  consulenze_servizi: [
    { value: 'n', label: 'n) Consulenze' },
    { value: 'o', label: 'o) Prestazioni Professionali' },
    { value: 'p', label: 'p) Altro (specificare)' },
  ],
  strumentazioni: [
    { value: 'q', label: 'q) PC' },
    { value: 'r', label: 'r) Software' },
    { value: 's', label: 's) Server' },
    { value: 't', label: 't) Arredi' },
    { value: 'u', label: 'u) Altro (specificare)' },
  ],
};

const SEZIONE1 = new Set(['a','b','c','d','e','f','h','i','j','k','n','o','p']);
const SEZIONE2 = new Set(['l','m','q','r','s','t','u']);
const VOCE_ALTRO = new Set(['h','m','p','u']);

const QUALITA_RICHIEDENTE = [
  { value: 'professore_ordinario', label: 'Professore Ordinario' },
  { value: 'professore_associato', label: 'Professore Associato' },
  { value: 'ricercatore',          label: 'Ricercatore' },
];

const fmtEuro = (v: number | string | undefined) => {
  if (v === undefined || v === '') return '';
  const [i, d] = String(v).split('.');
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${d !== undefined ? ',' + d : ''}`;
};
const parseEuro = (v: string | undefined) =>
  parseFloat((v || '').replace(/\./g, '').replace(',', '.')) || 0;

export function AutorizzazioneFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [form] = Form.useForm();
  const [tipo, setTipo] = useState<'progetto' | 'fondi_individuali'>('progetto');
  const [macro, setMacro] = useState<string | undefined>();
  const [voce, setVoce] = useState<string | undefined>();
  const [allegatoG, setAllegatoG] = useState<File | null>(null);
  const [allegatoPreventivo, setAllegatoPreventivo] = useState<File | null>(null);
  const [progettoId, setProgettoId] = useState<string | undefined>();

  const { data: progetti } = useQuery({
    queryKey: ['progetti', 'list', {}],
    queryFn: () => progettiApi.list({ stato: 'attivo' }).then(r => r.data.data),
  });

  const { data: dipartimenti } = useQuery({
    queryKey: ['dipartimenti'],
    queryFn: () => dipartimentiApi.list().then(r => r.data.data),
  });

  const { data: esistente, isLoading: caricamentoEsistente } = useQuery({
    queryKey: ['autorizzazione', id],
    queryFn: () => autorizzazioniApi.get(id!).then(r => r.data.data),
    enabled: isEdit,
  });

  // Precarica il form con i dati della bozza in modifica
  useEffect(() => {
    if (esistente) {
      setTipo(esistente.tipo);
      setMacro(esistente.macrocategoria);
      setVoce(esistente.voce_lettera);
      setProgettoId(esistente.progetto_id);
      form.setFieldsValue({
        ...esistente,
        durata_da: esistente.durata_da ? dayjs(esistente.durata_da) : undefined,
        durata_a: esistente.durata_a ? dayjs(esistente.durata_a) : undefined,
        anticipazione_spesa: esistente.anticipazione_spesa ? 'si' : 'no',
      });
    }
  }, [esistente, form]);

  // Quando si seleziona il progetto, auto-imposta il dipartimento
  const progetto = (progetti as { id: string; titolo: string; acronimo?: string; cup?: string; dipartimento_id?: string }[] | undefined)
    ?.find(p => p.id === progettoId);

  useEffect(() => {
    if (progetto?.dipartimento_id) {
      form.setFieldValue('dipartimento_id', progetto.dipartimento_id);
    }
  }, [progetto, form]);

  // Pre-compila "In qualità di" e "A tempo" dal "Ruolo nell'ente" della scheda personale
  const { data: personaCorrente } = useQuery({
    queryKey: ['persona', user?.id],
    queryFn: () => personaleApi.get(user!.id).then(r => r.data.data),
    enabled: !!user?.id && !isEdit,
  });

  useEffect(() => {
    if (!personaCorrente) return;
    const re = (personaCorrente.ruolo_ente || '').toLowerCase();
    if (re.includes('ordinario')) form.setFieldValue('qualita_richiedente', 'professore_ordinario');
    else if (re.includes('associato')) form.setFieldValue('qualita_richiedente', 'professore_associato');
    else if (re.includes('ricercatore') || re.includes('rtd')) form.setFieldValue('qualita_richiedente', 'ricercatore');

    if (re.includes('definito')) form.setFieldValue('tipo_contratto', 'definito');
    else if (re.includes('pieno')) form.setFieldValue('tipo_contratto', 'pieno');
  }, [personaCorrente, form]);

  // Pre-compila "In qualità di (nel progetto)" in base all'allocazione (PI o componente)
  const { data: allocazioniProgetto } = useQuery({
    queryKey: ['allocazioni', progettoId],
    queryFn: () => personaleApi.allocazioni.list(progettoId!).then(r => r.data.data),
    enabled: !!progettoId && tipo === 'progetto' && !isEdit,
  });

  useEffect(() => {
    if (!allocazioniProgetto) return;
    const mia = (allocazioniProgetto as Allocazione[]).find(a => a.persona_id === user?.id);
    if (mia) {
      form.setFieldValue('qualita_progetto', mia.is_pi
        ? 'Responsabile Scientifico del Progetto'
        : 'Componente del Gruppo di Ricerca');
    }
  }, [allocazioniProgetto, user, form]);

  const { mutate: salva, isPending } = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        tipo,
        durata_da: values.durata_da ? (values.durata_da as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        durata_a: values.durata_a ? (values.durata_a as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        anticipazione_spesa: values.anticipazione_spesa === 'si',
      };
      const resp = isEdit
        ? await autorizzazioniApi.update(id!, payload).then(r => r.data.data)
        : await autorizzazioniApi.create(payload).then(r => r.data.data);
      // Upload allegati
      if (allegatoG) await autorizzazioniApi.uploadAllegatoG(resp.id, allegatoG);
      if (allegatoPreventivo) await autorizzazioniApi.uploadPreventivo(resp.id, allegatoPreventivo);
      return resp;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['autorizzazioni'] });
      queryClient.invalidateQueries({ queryKey: ['autorizzazione', id] });
      message.success(isEdit ? 'Modifiche salvate.' : 'Richiesta creata. Ora puoi inviarla per approvazione.');
      navigate(`/autorizzazioni/${data.id}`);
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error?.message ?? 'Errore nel salvataggio';
      message.error(msg);
    },
  });

  if (isEdit && caricamentoEsistente) return null;

  const sezione = voce ? (SEZIONE1.has(voce) ? 1 : SEZIONE2.has(voce) ? 2 : voce === 'g' ? 3 : null) : null;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEdit ? `/autorizzazioni/${id}` : '/autorizzazioni')}>Indietro</Button>
            <Title level={3} style={{ margin: 0 }}>{isEdit ? 'Modifica richiesta autorizzazione spesa' : 'Nuova richiesta autorizzazione spesa'}</Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button onClick={() => navigate(isEdit ? `/autorizzazioni/${id}` : '/autorizzazioni')}>Annulla</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={isPending} onClick={() => form.submit()}>
              {isEdit ? 'Salva modifiche' : 'Salva in bozza'}
            </Button>
          </Space>
        </Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={salva}>

        {/* ── Tipo richiesta ── */}
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Tipo di richiesta</Text>
          <Radio.Group
            value={tipo} disabled={isEdit}
            onChange={e => { setTipo(e.target.value); form.resetFields(['progetto_id', 'dipartimento_id']); }}
          >
            <Radio value="progetto">Su progetto di ricerca</Radio>
            <Radio value="fondi_individuali">Su fondi individuali</Radio>
          </Radio.Group>
          {isEdit && <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>Tipo, progetto e dipartimento non sono modificabili: elimina la bozza e creane una nuova per cambiarli.</Text>}
        </div>

        {/* ── Dati richiedente ── */}
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Dati del richiedente</Text>

          <div style={{ background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Il sottoscritto</Text>
            <br />
            <Text strong>{user?.cognome} {user?.nome}</Text>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="qualita_richiedente" label="In qualità di" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <Select options={QUALITA_RICHIEDENTE} placeholder="Seleziona qualità" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tipo_contratto" label="A tempo" rules={[{ required: true, message: 'Obbligatorio' }]}>
                <Select options={[{ value: 'pieno', label: 'Pieno' }, { value: 'definito', label: 'Definito' }]} />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* ── Progetto / Dipartimento ── */}
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>
            {tipo === 'progetto' ? 'Dati del progetto' : 'Dipartimento di riferimento'}
          </Text>

          {tipo === 'progetto' && (
            <>
              <Form.Item name="progetto_id" label="Progetto" rules={[{ required: true, message: 'Seleziona il progetto' }]}>
                <Select
                  showSearch
                  disabled={isEdit}
                  placeholder="Seleziona progetto..."
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  options={(progetti as { id: string; titolo: string; acronimo?: string }[] | undefined)
                    ?.map(p => ({ value: p.id, label: `[${p.acronimo || '—'}] ${p.titolo}` })) ?? []}
                  onChange={progettoId => setProgettoId(progettoId as string)}
                />
              </Form.Item>
              <Form.Item name="qualita_progetto" label="In qualità di (nel progetto)">
                <Select options={[
                  { value: 'Responsabile Scientifico del Progetto', label: 'Responsabile Scientifico del Progetto' },
                  { value: 'Componente del Gruppo di Ricerca', label: 'Componente del Gruppo di Ricerca' },
                ]} placeholder="Seleziona ruolo nel progetto" />
              </Form.Item>
              {progetto?.cup && <Text type="secondary" style={{ fontSize: 12 }}>CUP: {progetto.cup}</Text>}
            </>
          )}

          <Form.Item
            name="dipartimento_id"
            label={tipo === 'progetto' ? 'Dipartimento (dal progetto)' : 'Dipartimento'}
            rules={[{ required: true, message: 'Seleziona il dipartimento' }]}
          >
            <Select
              placeholder="Seleziona dipartimento"
              disabled={isEdit || (tipo === 'progetto' && !!progetto?.dipartimento_id)}
              options={(dipartimenti as { id: string; nome: string }[] | undefined)
                ?.map(d => ({ value: d.id, label: d.nome })) ?? []}
            />
          </Form.Item>
        </div>

        {/* ── Tipo di spesa ── */}
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Tipo di spesa</Text>

          <Form.Item name="macrocategoria" label="Macrocategoria" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Select
              options={MACROCATEGORIE}
              placeholder="Seleziona macrocategoria"
              onChange={v => { setMacro(v); setVoce(undefined); form.setFieldValue('voce_lettera', undefined); }}
            />
          </Form.Item>

          {macro && (
            <Form.Item name="voce_lettera" label="Voce di costo" rules={[{ required: true, message: 'Obbligatorio' }]}>
              <Select
                options={VOCI_PER_MACRO[macro] ?? []}
                placeholder="Seleziona voce"
                onChange={v => setVoce(v as string)}
              />
            </Form.Item>
          )}

          {voce && VOCE_ALTRO.has(voce) && (
            <Form.Item name="voce_altro" label="Specificare" rules={[{ required: true, message: 'Obbligatorio' }]}>
              <Input placeholder="Descrizione voce di costo..." />
            </Form.Item>
          )}
        </div>

        {/* ── Dettagli spesa ── */}
        {sezione && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
              {sezione === 3 ? 'Sezione 3 — Incentivazione Personale Docente' : `Sezione ${sezione} — Dettagli della richiesta`}
            </Text>

            {sezione === 3 ? (
              <Alert
                type="info" showIcon
                message="Allegato obbligatorio"
                description="Per la voce g) è necessario allegare il Modulo Richiesta Incentivazione Personale Docente."
                style={{ marginBottom: 16 }}
              />
            ) : (
              <>
                <Form.Item name="oggetto" label="Oggetto (descrizione sintetica)" rules={[{ required: true, message: 'Obbligatorio' }]}>
                  <Input placeholder="Descrizione sintetica dell'oggetto della richiesta" />
                </Form.Item>
                <Form.Item name="descrizione" label="Descrizione (descrizione estesa)" rules={[{ required: true, message: 'Obbligatorio' }]}>
                  <TextArea rows={3} placeholder="Descrizione estesa dell'oggetto della richiesta" />
                </Form.Item>
                <Form.Item name="importo" label="Importo (€)" rules={[{ required: true, message: 'Obbligatorio' }]}>
                  <InputNumber
                    min={0} precision={2} style={{ width: '100%' }}
                    formatter={fmtEuro} parser={parseEuro as unknown as (v: string | undefined) => 0}
                  />
                </Form.Item>

                {sezione === 1 && (
                  <>
                    <Divider dashed style={{ margin: '12px 0' }} />
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="durata_da" label="Durata — Dal (opzionale)">
                          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="durata_a" label="Al (opzionale)">
                          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="termini_pagamento" label="Termini di pagamento (opzionale)">
                      <Input placeholder="es. pagamento mensile, 50% a metà e 50% a fine prestazione..." />
                    </Form.Item>
                  </>
                )}
              </>
            )}

            {/* Allegato voce g */}
            {voce === 'g' && (
              <Form.Item label="Modulo Incentivazione Personale Docente (obbligatorio)">
                {isEdit && esistente?.ha_allegato_g && !allegatoG && (
                  <Text type="success" style={{ display: 'block', marginBottom: 8 }}>✓ Documento già allegato — seleziona un file per sostituirlo</Text>
                )}
                <Upload
                  maxCount={1} beforeUpload={f => { setAllegatoG(f); return false; }}
                  onRemove={() => setAllegatoG(null)}
                  fileList={allegatoG ? [{ uid: '1', name: allegatoG.name, status: 'done' }] : []}
                >
                  <Button icon={<PaperClipOutlined />}>Allega documento</Button>
                </Upload>
              </Form.Item>
            )}

            {/* Allegato preventivo opzionale per sezione 2 */}
            {sezione === 2 && (
              <Form.Item label="Preventivo (opzionale)">
                {isEdit && esistente?.ha_allegato_preventivo && !allegatoPreventivo && (
                  <Text type="success" style={{ display: 'block', marginBottom: 8 }}>✓ Preventivo già allegato — seleziona un file per sostituirlo</Text>
                )}
                <Upload
                  maxCount={1} beforeUpload={f => { setAllegatoPreventivo(f); return false; }}
                  onRemove={() => setAllegatoPreventivo(null)}
                  fileList={allegatoPreventivo ? [{ uid: '1', name: allegatoPreventivo.name, status: 'done' }] : []}
                >
                  <Button icon={<PaperClipOutlined />}>Allega preventivo</Button>
                </Upload>
              </Form.Item>
            )}
          </div>
        )}

        {/* ── Anticipazione ── */}
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 24 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>Anticipazione spesa</Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            Il richiedente intende anticipare la spesa e attivare successivamente procedura di rimborso?
          </Text>
          <Form.Item name="anticipazione_spesa" rules={[{ required: true, message: 'Seleziona un\'opzione' }]}>
            <Radio.Group>
              <Radio value="si">SÌ</Radio>
              <Radio value="no">NO</Radio>
            </Radio.Group>
          </Form.Item>
        </div>
      </Form>
    </div>
  );
}
