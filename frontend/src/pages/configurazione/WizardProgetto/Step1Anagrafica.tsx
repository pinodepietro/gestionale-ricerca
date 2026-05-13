import { useEffect } from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Row, Col, Button, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { personaleApi } from '../../../api/personale';
import { configApi } from '../../../api/config';
import { queryKeys } from '../../../utils/queryKeys';
import { CreaTipoProgettoButton } from '../../../components/common/CreaTipoProgettoButton';
import dayjs from 'dayjs';

const { Title } = Typography;

interface Props {
  progettoId: string | null;
  onCompletato: (id: string) => void;
}

export function Step1Anagrafica({ progettoId, onCompletato }: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId!),
    queryFn: () => progettiApi.get(progettoId!).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const { data: amministrativi } = useQuery({
    queryKey: ['persone', { ruolo: 'amministrativo', attivo: true }],
    queryFn: () => personaleApi.list({ ruolo: 'amministrativo', attivo: true }).then(r => r.data.data),
  });

  const { data: tipiProgetto } = useQuery({
    queryKey: queryKeys.config.tipiProgetto,
    queryFn: () => configApi.tipiProgetto().then(r => r.data.data),
  });

  useEffect(() => {
    if (progetto) {
      form.setFieldsValue({
        ...progetto,
        data_inizio: progetto.data_inizio ? dayjs(progetto.data_inizio) : null,
        data_fine: progetto.data_fine ? dayjs(progetto.data_fine) : null,
        data_fine_rendicontazione: progetto.data_fine_rendicontazione
          ? dayjs(progetto.data_fine_rendicontazione) : null,
      });
    }
  }, [progetto, form]);

  const { mutate: salva, isPending } = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        data_inizio: dayjs(values.data_inizio as string).format('YYYY-MM-DD'),
        data_fine: dayjs(values.data_fine as string).format('YYYY-MM-DD'),
        data_fine_rendicontazione: values.data_fine_rendicontazione
          ? dayjs(values.data_fine_rendicontazione as string).format('YYYY-MM-DD') : undefined,
      };
      if (progettoId) {
        return progettiApi.update(progettoId, payload).then(r => r.data.data);
      }
      return progettiApi.create(payload).then(r => r.data.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.all });
      onCompletato(String(data.id));
    },
  });

  const opzioniAmministrativi = (amministrativi ?? []).map(p => ({
    value: p.id,
    label: `${p.cognome} ${p.nome}`,
  }));

  return (
    <Form form={form} layout="vertical" onFinish={salva}>
      <Title level={4} style={{ marginBottom: 24 }}>Dati anagrafici</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="codice" label="Codice interno" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Input placeholder="es. PRIN2024_001" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="acronimo" label="Acronimo">
            <Input placeholder="es. RESEARCH24" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="cup" label="CUP">
            <Input placeholder="Codice Unico di Progetto" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="titolo" label="Titolo completo" rules={[{ required: true, message: 'Obbligatorio' }]}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="descrizione" label="Descrizione">
        <Input.TextArea rows={3} placeholder="Descrizione libera del progetto..." />
      </Form.Item>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="tipo" label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Tipo progetto <CreaTipoProgettoButton />
            </span>
          } rules={[{ required: true, message: 'Obbligatorio' }]}>
            <Select
              options={(tipiProgetto ?? []).map((t: { nome: string }) => ({ value: t.nome, label: t.nome }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="data_inizio" label="Data inizio" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="data_fine" label="Data fine" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="data_fine_rendicontazione" label="Fine rendicontazione">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="costo_totale" label="Costo totale (€)" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="importo_finanziato" label="Importo finanziato (€)" rules={[{ required: true, message: 'Obbligatorio' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="amministrativo_id"
            label="Amministratore di progetto"
            rules={[{ required: true, message: 'Obbligatorio' }]}
          >
            <Select
              placeholder="Seleziona l'amministratore responsabile"
              options={opzioniAmministrativi}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="budget_per_partner" label="Budget per partner" initialValue={false}>
            <Select options={[
              { value: false, label: 'No — budget centralizzato' },
              { value: true, label: 'Sì — budget separato per partner' },
            ]} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="riferimento_bando" label="Riferimento bando">
        <Input.TextArea rows={2} placeholder="Estremi del bando di finanziamento, decreto, convenzione..." />
      </Form.Item>
      <Form.Item name="note" label="Note">
        <Input.TextArea rows={2} />
      </Form.Item>
      <div style={{ textAlign: 'right' }}>
        <Button type="primary" htmlType="submit" loading={isPending}>
          Salva e continua →
        </Button>
      </div>
    </Form>
  );
}
