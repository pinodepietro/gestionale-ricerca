import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker,
         Select, Typography, App, Popconfirm, Alert, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { budgetApi } from '../../../api/budget';
import { queryKeys } from '../../../utils/queryKeys';
import { apiErrorMessage } from '../../../utils/apiError';
import { RbacGuard } from '../../../components/common/RbacGuard';
import { formatEuro, formatData } from '../../../utils/formatters';
import type { Impegno, BudgetVoce } from '../../../types/budget';

const { Text } = Typography;

interface Props { progettoId: string; stato?: string; highlightId?: string | null; onHighlightConsumed?: () => void; }

export function TabImpegni({ progettoId, stato, highlightId, onHighlightConsumed }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [modalAperta, setModalAperta] = useState(false);
  const [impegnoInModifica, setImpegnoInModifica] = useState<Impegno | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.progetti.impegni(progettoId),
    queryFn: () => budgetApi.impegni.list(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const { data: budgetVoci } = useQuery({
    queryKey: queryKeys.progetti.budget(progettoId),
    queryFn: () => budgetApi.voci.list(progettoId).then(r => r.data.data),
    enabled: !!progettoId,
  });

  const vociDisponibili = (budgetVoci as BudgetVoce[] | undefined)
    ?.filter(bv => bv.voce?.categoria !== 'personale')
    .map(bv => ({
      value: bv.voce_id,
      label: bv.voce ? `${bv.voce.codice} — ${bv.voce.descrizione}` : bv.voce_id,
      disponibile: bv.importo_disponibile,
    })) ?? [];

  const creaImpegno = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      budgetApi.impegni.create(progettoId, {
        ...values,
        data: values.data ? dayjs(values.data as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.impegni(progettoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: 'Impegno registrato' });
      chiudiModal();
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante la registrazione') }),
  });

  const modificaImpegno = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      budgetApi.impegni.update(id, {
        ...values,
        data: values.data ? dayjs(values.data as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.impegni(progettoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: 'Impegno aggiornato' });
      chiudiModal();
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante la modifica') }),
  });

  const eliminaImpegno = useMutation({
    mutationFn: (id: string) => budgetApi.impegni.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.impegni(progettoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: 'Impegno eliminato' });
    },
    onError: (e: unknown) => notification.error({ message: apiErrorMessage(e, 'Errore durante l\'eliminazione') }),
  });

  function apriNuovo() {
    setImpegnoInModifica(null);
    form.resetFields();
    setModalAperta(true);
  }

  function apriModifica(imp: Impegno) {
    setImpegnoInModifica(imp);
    form.setFieldsValue({
      voce_id: imp.voce_id,
      data: imp.data ? dayjs(imp.data) : undefined,
      descrizione: imp.descrizione,
      importo: imp.importo,
    });
    setModalAperta(true);
  }

  function chiudiModal() {
    setModalAperta(false);
    setImpegnoInModifica(null);
    form.resetFields();
  }

  function onSubmit(values: Record<string, unknown>) {
    if (impegnoInModifica) {
      modificaImpegno.mutate({ id: impegnoInModifica.id, values });
    } else {
      creaImpegno.mutate(values);
    }
  }

  const impegni: Impegno[] = data ?? [];
  const impegniAttivi = impegni.filter(i => !i.stabilizzato);
  const impegniStabilizzati = impegni.filter(i => i.stabilizzato);
  const totale = impegniAttivi.reduce((s, i) => s + i.importo, 0);

  useEffect(() => {
    if (!highlightId || !impegni.some(i => i.id === highlightId)) return;
    const riga = document.querySelector(`tr[data-row-key="${highlightId}"]`);
    riga?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => onHighlightConsumed?.(), 2500);
    return () => clearTimeout(timer);
  }, [highlightId, impegni, onHighlightConsumed]);

  const vociSelectedWatch = Form.useWatch('voce_id', form);
  const vociSelezionataInfo = vociDisponibili.find(v => v.value === vociSelectedWatch);
  const disponibileVoce = vociSelezionataInfo
    ? vociSelezionataInfo.disponibile + (impegnoInModifica?.voce_id === vociSelectedWatch ? (impegnoInModifica?.importo ?? 0) : 0)
    : null;

  const colonne = [
    { title: 'Data', dataIndex: 'data', width: 110, render: formatData },
    {
      title: 'Voce di costo', dataIndex: 'voce', ellipsis: true,
      render: (_: unknown, r: Impegno) =>
        r.voce ? `${r.voce.codice} — ${r.voce.descrizione}` : '—',
    },
    { title: 'Descrizione', dataIndex: 'descrizione', ellipsis: true },
    {
      title: 'Importo', dataIndex: 'importo', align: 'right' as const,
      width: 130, render: formatEuro,
    },
    {
      title: 'Stato', width: 120, align: 'center' as const,
      render: (_: unknown, r: Impegno) =>
        r.stabilizzato
          ? <Tag color="volcano">Utilizzato</Tag>
          : <Tag color="green">Attivo</Tag>,
    },
    {
      title: '', key: 'azioni', width: 90,
      render: (_: unknown, r: Impegno) =>
        r.stabilizzato ? null : (
          <RbacGuard azione="progetto:modifica">
            <Space>
              <Button size="small" icon={<EditOutlined />} type="text"
                onClick={() => apriModifica(r)} />
              <Popconfirm
                title="Eliminare questo impegno?"
                description="L'importo sarà restituito alla disponibilità della voce di costo."
                onConfirm={() => eliminaImpegno.mutate(r.id)}
                okText="Elimina"
                okButtonProps={{ danger: true }}
                cancelText="Annulla"
              >
                <Button size="small" danger icon={<DeleteOutlined />} type="text" />
              </Popconfirm>
            </Space>
          </RbacGuard>
        ),
    },
  ];

  if (stato === 'bozza') {
    return (
      <Alert type="warning" showIcon
        message="Progetto non ancora attivo"
        description="Attiva il progetto per poter registrare gli impegni."
        style={{ marginTop: 8 }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text strong>Impegni del progetto</Text>
          <Text type="secondary">
            Totale attivi: <Text strong>{formatEuro(totale)}</Text>
            {impegniStabilizzati.length > 0 && (
              <Text type="secondary"> — {impegniStabilizzati.length} utilizzat{impegniStabilizzati.length === 1 ? 'o' : 'i'} (non contabilizzat{impegniStabilizzati.length === 1 ? 'o' : 'i'})</Text>
            )}
          </Text>
        </Space>
        <RbacGuard azione="progetto:modifica">
          <Button type="primary" icon={<PlusOutlined />} onClick={apriNuovo}>
            Nuovo impegno
          </Button>
        </RbacGuard>
      </div>

      <Table
        columns={colonne}
        dataSource={impegni}
        rowKey="id"
        loading={isLoading}
        rowClassName={(r: Impegno) => [
          r.stabilizzato ? 'impegno-stabilizzato' : '',
          r.id === highlightId ? 'impegno-evidenziato' : '',
        ].filter(Boolean).join(' ')}
        onRow={(r: Impegno) => ({
          style: r.stabilizzato ? { background: '#fff2f0', color: '#cf1322' } : {},
        })}
        pagination={{ pageSize: 20 }}
        size="middle"
        locale={{ emptyText: 'Nessun impegno registrato' }}
        summary={() => impegni.length > 0 ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              <Text strong>Totale</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <Text strong>{formatEuro(totale)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} />
          </Table.Summary.Row>
        ) : null}
      />

      <Modal
        title={impegnoInModifica ? 'Modifica impegno' : 'Nuovo impegno'}
        open={modalAperta}
        onCancel={chiudiModal}
        onOk={() => form.submit()}
        okText={impegnoInModifica ? 'Salva modifiche' : 'Registra'}
        cancelText="Annulla"
        confirmLoading={creaImpegno.isPending || modificaImpegno.isPending}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="voce_id" label="Voce di costo" rules={[{ required: true, message: 'Seleziona una voce di costo' }]}>
            <Select
              placeholder="Seleziona voce di costo"
              disabled={!!impegnoInModifica}
              options={vociDisponibili.map(v => ({
                value: v.value,
                label: `${v.label} (disp. ${formatEuro(v.disponibile)})`,
              }))}
            />
          </Form.Item>

          {disponibileVoce !== null && (
            <Alert
              type={disponibileVoce > 0 ? 'info' : 'error'}
              showIcon
              style={{ marginBottom: 12 }}
              message={`Disponibile sulla voce: ${formatEuro(disponibileVoce)}`}
            />
          )}

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="data" label="Data" rules={[{ required: true, message: 'Inserisci la data' }]}
              style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="importo" label="Importo (€)" rules={[{ required: true, message: 'Inserisci l\'importo' }]}
              style={{ flex: 1 }}>
              <InputNumber
                min={0.01}
                max={disponibileVoce ?? undefined}
                precision={2}
                style={{ width: '100%' }}
                placeholder="0.00"
              />
            </Form.Item>
          </Space>

          <Form.Item name="descrizione" label="Descrizione" rules={[{ required: true, message: 'Inserisci una descrizione' }]}>
            <Input.TextArea rows={3} placeholder="Descrizione dell'impegno (fornitore, contratto, riferimento...)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
