import { useState, useEffect } from 'react';
import { Form, InputNumber, Select, Button, Table, Space, Typography, Divider, Row, Col, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { configApi } from '../../../api/config';
import { queryKeys } from '../../../utils/queryKeys';
import { formatEuro } from '../../../utils/formatters';

const { Title, Text } = Typography;

interface VoceBudget { voce_id: string; importo_previsto: number; }

interface Props {
  progettoId: string;
  onCompletato: () => void;
  onIndietro: () => void;
}

export function Step2Finanziamento({ progettoId, onCompletato, onIndietro }: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [vociSelezionate, setVociSelezionate] = useState<VoceBudget[]>([]);

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId),
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const { data: voci } = useQuery({
    queryKey: queryKeys.config.vociDiCosto,
    queryFn: () => configApi.vociDiCosto().then(r => r.data.data),
  });

  const { data: budgetEsistente } = useQuery({
    queryKey: queryKeys.progetti.budget(progettoId),
    queryFn: () => progettiApi.budget.list(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  useEffect(() => {
    if (budgetEsistente && budgetEsistente.length > 0 && vociSelezionate.length === 0) {
      const vociCaricate = budgetEsistente.map((v: { voce_id: string; importo_previsto: number }) => ({
        voce_id: v.voce_id,
        importo_previsto: v.importo_previsto,
      }));
      setVociSelezionate(vociCaricate);
    }
  }, [budgetEsistente]);

  const { mutate: salvaBudget, isPending } = useMutation({
    mutationFn: () => progettiApi.budget.salva(progettoId, vociSelezionate).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      onCompletato();
    },
  });

  function aggiungiVoce(values: VoceBudget) {
    if (vociSelezionate.find(v => v.voce_id === values.voce_id)) return;
    setVociSelezionate(prev => [...prev, values]);
    form.resetFields();
  }

  function rimuoviVoce(voce_id: string) {
    setVociSelezionate(prev => prev.filter(v => v.voce_id !== voce_id));
  }

  const totale = vociSelezionate.reduce((s, v) => s + Number(v.importo_previsto), 0);
  const costoTotale = progetto?.costo_totale ?? 0;
  const budgetEccessivo = totale > costoTotale && costoTotale > 0;

  const colonne = [
    {
      title: 'Voce di costo', dataIndex: 'voce_id',
      render: (id: string) => {
        const v = voci?.find((x: { id: string }) => x.id === id);
        return v ? `${v.codice} — ${v.descrizione}` : id;
      },
    },
    { title: 'Importo previsto', dataIndex: 'importo_previsto', align: 'right' as const, render: formatEuro },
    {
      title: '', width: 60,
      render: (_: unknown, r: VoceBudget) => (
        <Button danger icon={<DeleteOutlined />} size="small" type="text" onClick={() => rimuoviVoce(r.voce_id)} />
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Finanziamento e budget</Title>
      <Title level={5}>Voci di budget</Title>
      <Form form={form} layout="inline" onFinish={aggiungiVoce} style={{ marginBottom: 16 }}>
        <Form.Item name="voce_id" rules={[{ required: true, message: 'Seleziona voce' }]} style={{ minWidth: 320 }}>
          <Select placeholder="Seleziona voce di costo"
            options={voci?.filter((v: { id: string }) => !vociSelezionate.find(s => s.voce_id === v.id))
              .map((v: { id: string; codice: string; descrizione: string }) => ({
                value: v.id, label: `${v.codice} — ${v.descrizione}`,
              }))}
            showSearch filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
        </Form.Item>
        <Form.Item name="importo_previsto" rules={[{ required: true, message: 'Inserisci importo' }]}>
          <InputNumber min={0} precision={2} placeholder="Importo €" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" icon={<PlusOutlined />} htmlType="submit">Aggiungi</Button>
        </Form.Item>
      </Form>
      <Table columns={colonne} dataSource={vociSelezionate} rowKey="voce_id" pagination={false} size="small"
        locale={{ emptyText: 'Nessuna voce aggiunta' }}
        summary={() => vociSelezionate.length > 0 ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><Text strong>Totale budget</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><Text strong>{formatEuro(totale)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={2} />
          </Table.Summary.Row>
        ) : null} />

      {budgetEccessivo && (
        <Alert type="warning" showIcon style={{ marginTop: 16 }}
          message={`Il totale delle voci (${formatEuro(totale)}) supera il costo totale del progetto (${formatEuro(costoTotale)})`} />
      )}

      <Divider />
      <Row justify="space-between">
        <Col><Button onClick={onIndietro}>← Indietro</Button></Col>
        <Col>
          <Space>
            <Button onClick={onCompletato}>Salta (configura dopo)</Button>
            <Button type="primary" loading={isPending}
              onClick={() => vociSelezionate.length > 0 ? salvaBudget() : onCompletato()}>
              Salva e continua →
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
