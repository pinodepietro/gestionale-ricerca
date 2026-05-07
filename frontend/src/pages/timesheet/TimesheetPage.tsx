// frontend/src/pages/timesheet/TimesheetPage.tsx
import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Select, Typography, App } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { timesheetApi } from '../../api/timesheet';
import { progettiApi } from '../../api/progetti';
import { queryKeys } from '../../utils/queryKeys';
import { useAuthStore } from '../../store/useAuthStore';
import type { TimesheetTestata } from '../../types/timesheet';

const { Title, Text } = Typography;

const MESI = ['','Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
              'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const COLORI_STATO: Record<string, string> = {
  bozza: 'default', inviato: 'blue', approvato: 'green', rifiutato: 'red',
};

const ANNO_CORRENTE = new Date().getFullYear();
const ANNI = [ANNO_CORRENTE - 1, ANNO_CORRENTE, ANNO_CORRENTE + 1];

export function TimesheetPage() {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [searchParams] = useSearchParams();
  const progettoIdPreselezionato = searchParams.get('progetto_id');

  const [filtroProgetto, setFiltroProgetto] = useState<string | undefined>(
    progettoIdPreselezionato ?? undefined
  );
  const [modalAperta, setModalAperta] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (progettoIdPreselezionato) {
      setFiltroProgetto(progettoIdPreselezionato);
      setModalAperta(true);
    }
  }, [progettoIdPreselezionato]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.timesheet.list({ progetto_id: filtroProgetto }),
    queryFn: () => timesheetApi.list({ progetto_id: filtroProgetto }).then(r => r.data),
  });

  const { data: progetti } = useQuery({
    queryKey: queryKeys.progetti.list({ stato: 'attivo' }),
    queryFn: () => progettiApi.list({ stato: 'attivo' }).then(r => r.data.data),
  });

  const creaTimesheet = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      timesheetApi.create({ ...values, persona_id: user?.id }).then(r => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
      notification.success({ message: 'Timesheet creato' });
      setModalAperta(false);
      form.resetFields();
      navigate(`/timesheet/${data.id}`);
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Errore durante la creazione' });
    },
  });

  const colonne = [
    {
      title: 'Persona', dataIndex: 'persona_nome', width: 160,
    },
    {
      title: 'Progetto', dataIndex: 'progetto_id',
      render: (id: string) => {
        const p = progetti?.find((p: {id: string}) => p.id === id);
        return p ? <Text strong>{p.acronimo || p.codice}</Text> : <Text type="secondary">{id.slice(0,8)}...</Text>;
      },
    },
    {
      title: 'Periodo', key: 'periodo',
      render: (_: unknown, r: TimesheetTestata) => `${MESI[r.mese]} ${r.anno}`,
    },
    {
      title: 'Ore progetto', dataIndex: 'ore_totali_progetto', width: 130,
      render: (v: number) => v ? `${v}h` : '—',
    },
    {
      title: 'Stato', dataIndex: 'stato', width: 110,
      render: (stato: string) => <Tag color={COLORI_STATO[stato]}>{stato}</Tag>,
    },
    {
      title: '', key: 'azioni', width: 80,
      render: (_: unknown, r: TimesheetTestata) => (
        <Button size="small" icon={<EditOutlined />}
          onClick={() => navigate(`/timesheet/${r.id}`)}>
          Apri
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Timesheet</Title>
        {user?.ruolo !== 'amministrativo' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAperta(true)}>
            Nuovo timesheet
          </Button>
        )}
      </Space>

      {/* Filtro per progetto */}
      <Space style={{ marginBottom: 16 }}>
        <Text>Filtra per progetto:</Text>
        <Select
          allowClear
          placeholder="Tutti i progetti"
          style={{ width: 300 }}
          value={filtroProgetto}
          onChange={setFiltroProgetto}
          options={progetti?.map((p: {id: string; acronimo: string; titolo: string; codice: string}) => ({
            value: p.id,
            label: `${p.acronimo || p.codice} — ${p.titolo}`,
          }))}
          showSearch
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
        />
      </Space>

      <Table
        columns={colonne}
        dataSource={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: filtroProgetto ? 'Nessun timesheet per questo progetto' : 'Nessun timesheet' }}
      />

      <Modal
        title="Nuovo timesheet"
        open={modalAperta}
        onCancel={() => { setModalAperta(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Crea e apri editor"
        cancelText="Annulla"
        confirmLoading={creaTimesheet.isPending}
        width={440}
      >
        <Form form={form} layout="vertical" onFinish={(v) => creaTimesheet.mutate(v)}
          style={{ marginTop: 16 }}
          initialValues={{ anno: ANNO_CORRENTE, granularita: 'mensile',
            progetto_id: progettoIdPreselezionato ?? undefined }}>
          <Form.Item name="progetto_id" label="Progetto" rules={[{ required: true }]}>
            {progettoIdPreselezionato ? (
              <Select disabled
                options={progetti?.map((p: {id: string; acronimo: string; titolo: string; codice: string}) => ({
                  value: p.id, label: `${p.acronimo || p.codice} — ${p.titolo}`,
                }))} />
            ) : (
              <Select placeholder="Seleziona progetto"
                options={progetti?.map((p: {id: string; acronimo: string; titolo: string; codice: string}) => ({
                  value: p.id, label: `${p.acronimo || p.codice} — ${p.titolo}`,
                }))}
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
            )}
          </Form.Item>
          <Form.Item name="anno" label="Anno" rules={[{ required: true }]}>
            <Select options={ANNI.map(a => ({ value: a, label: a }))} />
          </Form.Item>
          <Form.Item name="mese" label="Mese" rules={[{ required: true }]}>
            <Select options={MESI.slice(1).map((m, i) => ({ value: i + 1, label: m }))} />
          </Form.Item>
          <Form.Item name="granularita" label="Granularità" rules={[{ required: true }]}>
            <Select options={[
              { value: 'mensile', label: 'Mensile (totale mese per WP)' },
              { value: 'giornaliero', label: 'Giornaliero (colonna per ogni giorno)' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
