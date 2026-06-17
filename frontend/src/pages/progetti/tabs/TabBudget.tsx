import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { configApi } from '../../../api/config';
import { queryKeys } from '../../../utils/queryKeys';
import { Table, Progress, Typography, Alert, Button, Modal, Form, Select, InputNumber, App } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { budgetApi } from '../../../api/budget';
import { formatEuro, formatPercentuale, coloreBudget } from '../../../utils/formatters';
import { RbacGuard } from '../../../components/common/RbacGuard';
import { CreaVoceDiCostoButton } from '../../../components/common/CreaVoceDiCostoButton';
import type { BudgetVoce } from '../../../types/budget';

const { Text } = Typography;

interface VoceBudget { voce_id: string; importo_previsto: number; }

export function TabBudget({ progettoId }: { progettoId: string }) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [vociLocali, setVociLocali] = useState<VoceBudget[]>([]);
  const [form] = Form.useForm();

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(progettoId),
    queryFn: () => progettiApi.get(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.progetti.budget(progettoId),
    queryFn: () => budgetApi.voci.list(progettoId).then((r) => r.data.data),
  });

  const { data: tutteLeVoci } = useQuery({
    queryKey: queryKeys.config.vociDiCosto,
    queryFn: () => configApi.vociDiCosto().then(r => r.data.data),
    enabled: modalAperta,
  });

  const { mutate: salvaBudget, isPending } = useMutation({
    mutationFn: (voci: VoceBudget[]) =>
      progettiApi.budget.salva(progettoId, voci).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: 'Budget aggiornato' });
      setModalAperta(false);
    },
    onError: () => notification.error({ message: 'Errore durante il salvataggio' }),
  });

  function apriModifica() {
    const correnti = (data ?? []).map((v: BudgetVoce) => ({
      voce_id: v.voce_id,
      importo_previsto: v.importo_previsto,
    }));
    setVociLocali(correnti);
    setModalAperta(true);
  }

  function aggiungiVoce(values: VoceBudget) {
    if (vociLocali.find(v => v.voce_id === values.voce_id)) return;
    setVociLocali(prev => [...prev, values]);
    form.resetFields();
  }

  function rimuoviVoce(voce_id: string) {
    setVociLocali(prev => prev.filter(v => v.voce_id !== voce_id));
  }

  const totAllocato = (data ?? []).reduce((s: number, r: BudgetVoce) => s + r.importo_previsto, 0);
  const costoTotale = progetto?.costo_totale ?? 0;
  const nonAllocato = costoTotale - totAllocato;

  const vociGiaAggiunte = new Set(vociLocali.map(v => v.voce_id));
  const totaleLocale = vociLocali.reduce((s, v) => s + Number(v.importo_previsto), 0);

  const columns = [
    { title: 'Voce di costo', dataIndex: ['voce', 'descrizione'], ellipsis: true },
    { title: 'Previsto', dataIndex: 'importo_previsto', align: 'right' as const, width: 130, render: formatEuro },
    { title: 'Erogato', dataIndex: 'importo_erogato', align: 'right' as const, width: 120,
      render: (v: number) => <Text type={v > 0 ? 'success' : undefined}>{formatEuro(v)}</Text>,
    },
    {
      title: 'Impegnato', dataIndex: 'importo_impegnato', align: 'right' as const, width: 120,
      render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{formatEuro(v)}</Text>,
    },
    {
      title: 'Speso', dataIndex: 'importo_speso', align: 'right' as const, width: 120,
      render: (v: number) => formatEuro(v),
    },
    { title: 'Rendicontato', dataIndex: 'importo_rendicontato', align: 'right' as const, width: 130, render: formatEuro },
    {
      title: 'Disponibile', dataIndex: 'importo_disponibile', align: 'right' as const, width: 120,
      render: (v: number) => <Text type={v < 0 ? 'danger' : undefined}>{formatEuro(v)}</Text>,
    },
    {
      title: '% Utilizzato', dataIndex: 'percentuale_utilizzata', width: 160,
      render: (pct: number) => (
        <Progress
          percent={Math.min(pct, 100)} size="small"
          strokeColor={coloreBudget(pct) === 'green' ? '#52c41a' : coloreBudget(pct) === 'orange' ? '#faad14' : '#ff4d4f'}
          format={() => formatPercentuale(pct)}
        />
      ),
    },
  ];

  const colonneModifica = [
    {
      title: 'Voce di costo', dataIndex: 'voce_id',
      render: (id: string) => {
        const v = (tutteLeVoci as { id: string; codice: string; descrizione: string }[] | undefined)
          ?.find(x => x.id === id);
        return v ? `${v.codice} — ${v.descrizione}` : id;
      },
    },
    {
      title: 'Importo previsto', dataIndex: 'importo_previsto', align: 'right' as const,
      render: formatEuro,
    },
    {
      title: '', width: 48,
      render: (_: unknown, r: VoceBudget) => (
        <Button danger icon={<DeleteOutlined />} size="small" type="text"
          onClick={() => rimuoviVoce(r.voce_id)} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <RbacGuard azione="progetto:modifica">
          <Button icon={<EditOutlined />} onClick={apriModifica}>
            Modifica budget
          </Button>
        </RbacGuard>
      </div>

      {nonAllocato > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 16, borderColor: '#BA7517' }}
          message={
            <span>
              Budget non allocato per voce di costo: <strong>{formatEuro(nonAllocato)}</strong>
              {' '}(costo totale: {formatEuro(costoTotale)}, allocato: {formatEuro(totAllocato)})
            </span>
          }
        />
      )}

      <Table columns={columns} dataSource={data ?? []} rowKey="id" loading={isLoading}
        pagination={false}
        summary={(rows) => {
          const totPrevisto = rows.reduce((s, r) => s + (r as BudgetVoce).importo_previsto, 0);
          const totErogato = rows.reduce((s, r) => s + ((r as BudgetVoce).importo_erogato ?? 0), 0);
          const totImpegnato = rows.reduce((s, r) => s + ((r as BudgetVoce).importo_impegnato ?? 0), 0);
          const totSpeso = rows.reduce((s, r) => s + ((r as BudgetVoce).importo_speso ?? 0), 0);
          const totRendicontato = rows.reduce((s, r) => s + (r as BudgetVoce).importo_rendicontato, 0);
          const totDisponibile = totErogato - totImpegnato - totSpeso;
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><Text strong>Totale</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><Text strong>{formatEuro(totPrevisto)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><Text strong>{formatEuro(totErogato)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><Text strong>{formatEuro(totImpegnato)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><Text strong>{formatEuro(totSpeso)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><Text strong>{formatEuro(totRendicontato)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <Text strong type={totDisponibile < 0 ? 'danger' : undefined}>
                  {formatEuro(totDisponibile)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} />
            </Table.Summary.Row>
          );
        }}
      />

      <Modal
        title="Modifica budget del progetto"
        open={modalAperta}
        onCancel={() => setModalAperta(false)}
        onOk={() => salvaBudget(vociLocali)}
        confirmLoading={isPending}
        okText="Salva budget"
        cancelText="Annulla"
        width={620}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#555' }}>Aggiungi voce al budget:</span>
          <CreaVoceDiCostoButton />
        </div>
        <Form form={form} layout="inline" onFinish={aggiungiVoce} style={{ marginBottom: 12 }}>
          <Form.Item name="voce_id" rules={[{ required: true }]} style={{ minWidth: 300 }}>
            <Select placeholder="Seleziona voce di costo" showSearch
              options={(tutteLeVoci as { id: string; codice: string; descrizione: string }[] | undefined)
                ?.filter(v => !vociGiaAggiunte.has(v.id))
                .map(v => ({ value: v.id, label: `${v.codice} — ${v.descrizione}` }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
          </Form.Item>
          <Form.Item name="importo_previsto" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} placeholder="Importo €" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<PlusOutlined />} htmlType="submit">Aggiungi</Button>
          </Form.Item>
        </Form>

        <Table columns={colonneModifica} dataSource={vociLocali} rowKey="voce_id"
          pagination={false} size="small" locale={{ emptyText: 'Nessuna voce' }}
          summary={() => vociLocali.length > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><Text strong>Totale</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><Text strong>{formatEuro(totaleLocale)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
            </Table.Summary.Row>
          ) : null}
        />

        {costoTotale > 0 && totaleLocale > costoTotale && (
          <Alert type="warning" showIcon style={{ marginTop: 12 }}
            message={`Il totale (${formatEuro(totaleLocale)}) supera il costo totale del progetto (${formatEuro(costoTotale)})`} />
        )}
      </Modal>
    </div>
  );
}
