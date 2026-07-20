// frontend/src/pages/timesheet/TimesheetEditor.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Spin, Button, Space, Table, InputNumber, Tag, App, Popconfirm, Alert } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons';
import { timesheetApi } from '../../api/timesheet';
import { progettiApi } from '../../api/progetti';
import { queryKeys } from '../../utils/queryKeys';
import { env } from '../../config/env';
import { useAuthStore } from '../../store/useAuthStore';
import type { TimesheetRiga, TimesheetRigaPayload } from '../../types/timesheet';

const { Title, Text } = Typography;

const MESI = ['','Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
              'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const COLORI_STATO: Record<string, string> = {
  bozza: 'default', inviato: 'blue', attesa_dg: 'orange', approvato: 'green', rifiutato: 'red',
};

const LABEL_TIPO: Record<string, string> = {
  progetto: 'Progetto',
  altri_progetti: 'Altri progetti',
  ordinaria: 'Attività ordinaria',
  assenze: 'Assenze',
};

export function TimesheetEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);

  // Stato locale delle ore (righe x celle)
  const [oreLocali, setOreLocali] = useState<Record<string, Record<number, number>>>({});
  const [modificato, setModificato] = useState(false);

  const { data: ts, isLoading } = useQuery({
    queryKey: queryKeys.timesheet.detail(id!),
    queryFn: () => timesheetApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: allocazioni } = useQuery({
    queryKey: queryKeys.progetti.allocazioni(ts?.progetto_id ?? ''),
    queryFn: () => progettiApi.allocazioni.list(ts!.progetto_id).then(r => r.data.data),
    enabled: !!ts?.progetto_id,
  });

  const { data: persona } = useQuery({
    queryKey: ['persona', ts?.persona_id],
    queryFn: () => fetch(`${env.apiUrl}/api/v1/persone/${ts!.persona_id}`).then(r => r.json()).then(r => r.data),
    enabled: !!ts?.persona_id,
  });

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(ts?.progetto_id ?? ''),
    queryFn: () => progettiApi.get(ts!.progetto_id).then(r => r.data.data),
    enabled: !!ts?.progetto_id,
  });

  // Inizializza ore locali dai dati server
  useEffect(() => {
    if (ts && !modificato) {
      const init: Record<string, Record<number, number>> = {};
      ts.righe?.forEach((r: TimesheetRiga) => {
        init[r.id] = {};
        r.celle.forEach(c => { init[r.id][c.giorno] = c.ore; });
      });
      setOreLocali(init);
    }
  }, [ts]);

  const salvaRighe = useMutation({
    mutationFn: () => {
      const righe: TimesheetRigaPayload[] = (ts?.righe ?? []).map((r: TimesheetRiga, idx: number) => ({
        tipo_riga: r.tipo_riga,
        wp_id: r.wp_id,
        task_id: r.task_id,
        progetto_correlato_id: r.progetto_correlato_id,
        descrizione_libera: r.descrizione_libera,
        ordine: idx,
        celle: r.celle.map(c => ({
          giorno: c.giorno,
          ore: oreLocali[r.id]?.[c.giorno] ?? c.ore,
        })),
      }));
      return timesheetApi.aggiornaRighe(id!, { righe });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.detail(id!) });
      setModificato(false);
      notification.success({ message: 'Timesheet salvato' });
    },
    onError: () => notification.error({ message: 'Errore durante il salvataggio' }),
  });

  const inviaTimesheet = useMutation({
    mutationFn: () => timesheetApi.invia(id!).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.detail(id!) });
      notification.success({ message: 'Timesheet inviato per approvazione' });
    },
    onError: (error: unknown) => {
      const err = (error as { response?: { data?: { detail?: { error?: { message?: string } } } } })
        ?.response?.data?.detail?.error;
      notification.error({ message: err?.message ?? 'Errore durante l\'invio' });
    },
  });

  const approvaTimesheet = useMutation({
    mutationFn: () => timesheetApi.approva(id!).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
      notification.success({ message: 'Timesheet approvato' });
    },
  });

  const rifiutaTimesheet = useMutation({
    mutationFn: () => timesheetApi.rifiuta(id!, '').then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
      notification.success({ message: 'Timesheet rifiutato' });
    },
  });

  const approvaFinaleTimesheet = useMutation({
    mutationFn: () => timesheetApi.approvaFinale(id!).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
      notification.success({ message: 'Timesheet approvato definitivamente' });
    },
  });

  const eliminaTimesheet = useMutation({
    mutationFn: () => timesheetApi.delete!(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
      queryClient.removeQueries({ queryKey: queryKeys.timesheet.detail(id!) });
      notification.success({ message: 'Timesheet eliminato' });
      navigate('/timesheet');
    },
  });


  const downloadExcel = async (url: string, filename: string) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) { return; }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!ts) return <Text type="danger">Timesheet non trovato.</Text>;

  const isGiornaliero = ts.granularita === 'giornaliero';
  const isModificabile = ts.stato === 'bozza' || ts.stato === 'rifiutato';
  const puoEliminare = isModificabile || user?.ruolo === 'amministrativo';
  // PI del progetto specifico può approvare (anche il proprio timesheet)
  const ePI = (allocazioni as { persona_id: string; is_pi?: boolean }[] | undefined)
    ?.some(a => a.persona_id === user?.id && a.is_pi) ?? false;
  const puoApprovarePI = ePI && ts.stato === 'inviato';

  // Direttore Generale può approvare definitivamente
  const eDG = user?.ruolo === 'direttore_generale' || user?.ruolo === 'superadmin';
  const puoApprovareFinale = eDG && ts.stato === 'attesa_dg';

  // Sia PI che DG possono rifiutare
  const puoRifiutare = (ePI && ts.stato === 'inviato') || (eDG && ts.stato === 'attesa_dg');

  // Calcola giorni del mese per granularità giornaliera
  const giorni = isGiornaliero
    ? Array.from({ length: new Date(ts.anno, ts.mese, 0).getDate() }, (_, i) => i + 1)
    : [0];

  const aggiornaOre = (rigaId: string, giorno: number, ore: number) => {
    setOreLocali(prev => ({
      ...prev,
      [rigaId]: { ...(prev[rigaId] ?? {}), [giorno]: ore },
    }));
    setModificato(true);
  };

  const totalePeriodo = (ts.righe ?? []).reduce((tot: number, r: TimesheetRiga) => {
    return tot + r.celle.reduce((s, c) => s + (oreLocali[r.id]?.[c.giorno] ?? c.ore), 0);
  }, 0);

  // Colonne tabella
  const colonne = [
    {
      title: 'Attività', key: 'attivita', width: isGiornaliero ? 200 : 320,
      render: (_: unknown, r: TimesheetRiga) => (
        <Space direction="vertical" size={0}>
          <Tag color={r.tipo_riga === 'progetto' ? 'blue' : 'default'} style={{ fontSize: 11 }}>
            {LABEL_TIPO[r.tipo_riga]}
          </Tag>
          <Text style={{ fontSize: 13 }}>{r.descrizione_libera}</Text>
        </Space>
      ),
    },
    ...(isGiornaliero
      ? giorni.map(g => ({
          title: String(g),
          key: `g${g}`,
          width: 52,
          align: 'center' as const,
          render: (_: unknown, r: TimesheetRiga) => {
            const cella = r.celle.find(c => c.giorno === g);
            if (!cella) return '—';
            return isModificabile ? (
              <InputNumber
                size="small"
                min={0} max={24} step={0.5} precision={1}
                value={oreLocali[r.id]?.[g] ?? cella.ore}
                onChange={v => aggiornaOre(r.id, g, v ?? 0)}
                style={{ width: 48 }}
                controls={false}
              />
            ) : <Text>{oreLocali[r.id]?.[g] ?? cella.ore}</Text>;
          },
        }))
      : [{
          title: 'Ore totali mese',
          key: 'ore_mese',
          width: 140,
          align: 'center' as const,
          render: (_: unknown, r: TimesheetRiga) => {
            const cella = r.celle.find(c => c.giorno === 0);
            if (!cella) return '—';
            return isModificabile ? (
              <InputNumber
                min={0} max={744} step={0.5} precision={1}
                value={oreLocali[r.id]?.[0] ?? cella.ore}
                onChange={v => aggiornaOre(r.id, 0, v ?? 0)}
                style={{ width: 100 }}
                addonAfter="h"
              />
            ) : <Text strong>{oreLocali[r.id]?.[0] ?? cella.ore}h</Text>;
          },
        }]
    ),
    {
      title: 'Totale',
      key: 'totale_riga',
      width: 80,
      align: 'right' as const,
      render: (_: unknown, r: TimesheetRiga) => {
        const tot = r.celle.reduce((s, c) => s + (oreLocali[r.id]?.[c.giorno] ?? c.ore), 0);
        return <Text strong>{tot}h</Text>;
      },
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => navigate('/timesheet')}>
          Tutti i timesheet
        </Button>
      </Space>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Space align="center">
            <Title level={2} style={{ margin: 0 }}>
              {MESI[ts.mese]} {ts.anno}
            </Title>
            <Tag color={COLORI_STATO[ts.stato]}>{ts.stato}</Tag>
          </Space>
          <div style={{ marginTop: 8 }}>
            <Text>
              <Text strong>Persona:</Text> {persona?.nome} {persona?.cognome}
            </Text>
            <br />
            <Text>
              <Text strong>Progetto:</Text> {progetto?.acronimo || progetto?.codice} — {progetto?.titolo}
            </Text>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary">
              {isGiornaliero ? 'Granularità giornaliera' : 'Granularità mensile'}
              {' · '}Totale periodo: <Text strong>{totalePeriodo}h</Text>
            </Text>
          </div>
        </div>

        <Space>
          {puoEliminare && (
            <Popconfirm
              title="Eliminare questo timesheet?"
              onConfirm={() => eliminaTimesheet.mutate()}
              okText="Elimina" cancelText="Annulla" okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} loading={eliminaTimesheet.isPending}>
                Elimina
              </Button>
            </Popconfirm>
          )}
          {isModificabile && (
            <Button
              icon={<SaveOutlined />}
              onClick={() => salvaRighe.mutate()}
              loading={salvaRighe.isPending}
              disabled={!modificato}
            >
              Salva bozza
            </Button>
          )}
          {isModificabile && (
            <Popconfirm
              title="Invia per approvazione?"
              description="Dopo l'invio non potrai più modificare le ore."
              onConfirm={() => {
                if (modificato) {
                  salvaRighe.mutate(undefined, {
                    onSuccess: () => inviaTimesheet.mutate(),
                  });
                } else {
                  inviaTimesheet.mutate();
                }
              }}
              okText="Invia"
              cancelText="Annulla"
            >
              <Button type="primary" icon={<SendOutlined />} loading={inviaTimesheet.isPending}>
                Invia per approvazione
              </Button>
            </Popconfirm>
          )}
          {ts.stato === 'approvato' && (
            <Space>
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => downloadExcel(
                  `${env.apiUrl}/api/v1/timesheet/${id}/export/xlsx`,
                  `timesheet_${id}.xlsx`
                )}
              >
                Esporta Excel
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                type="dashed"
                onClick={() => downloadExcel(
                  `${env.apiUrl}/api/v1/timesheet/${id}/export/template`,
                  `timesheet_template_${id}.xlsx`
                )}
              >
                Esporta con template ente
              </Button>
            </Space>
          )}

          {ts.stato === 'inviato' && puoApprovarePI && (
            <>
              <Button type="primary" icon={<CheckOutlined />}
                onClick={() => approvaTimesheet.mutate()}
                loading={approvaTimesheet.isPending}>
                Approva
              </Button>
              <Popconfirm title="Rifiutare questo timesheet?"
                onConfirm={() => rifiutaTimesheet.mutate()}
                okText="Rifiuta" cancelText="Annulla" okButtonProps={{ danger: true }}>
                <Button danger icon={<CloseOutlined />}>Rifiuta</Button>
              </Popconfirm>
            </>
          )}

          {ts.stato === 'attesa_dg' && puoApprovareFinale && (
            <>
              <Button type="primary" icon={<CheckOutlined />}
                onClick={() => approvaFinaleTimesheet.mutate()}
                loading={approvaFinaleTimesheet.isPending}>
                Approva definitivamente
              </Button>
              <Popconfirm title="Rifiutare questo timesheet?"
                onConfirm={() => rifiutaTimesheet.mutate()}
                okText="Rifiuta" cancelText="Annulla" okButtonProps={{ danger: true }}>
                <Button danger icon={<CloseOutlined />}>Rifiuta</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      </div>

      {ts.stato === 'rifiutato' && (
        <Alert type="error" message="Timesheet rifiutato" showIcon style={{ marginBottom: 16 }}
          description={
            <Space direction="vertical" size={8}>
              <Text>Il timesheet è stato rifiutato. Modifica le ore e reinvialo per approvazione.</Text>
              {ts.motivazione_rifiuto && (
                <Text type="secondary">Motivazione: <Text strong>{ts.motivazione_rifiuto}</Text></Text>
              )}
            </Space>
          }
          action={
            <Button type="primary" size="small"
              loading={inviaTimesheet.isPending}
              onClick={() => inviaTimesheet.mutate()}>
              Reinvia per approvazione
            </Button>
          }
        />
      )}

      {modificato && (
        <Alert type="warning" message="Hai modifiche non salvate" showIcon style={{ marginBottom: 16 }} />
      )}

      <Table
        columns={colonne}
        dataSource={ts.righe ?? []}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={isGiornaliero ? { x: 'max-content' } : undefined}
        locale={{ emptyText: 'Nessuna riga nel timesheet' }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><Text strong>Totale</Text></Table.Summary.Cell>
            {isGiornaliero
              ? giorni.map((g, i) => (
                  <Table.Summary.Cell key={g} index={i + 1} align="center">
                    <Text strong style={{ fontSize: 11 }}>
                      {(ts.righe ?? []).reduce((s: number, r: TimesheetRiga) => {
                        const cella = r.celle.find(c => c.giorno === g);
                        return s + (oreLocali[r.id]?.[g] ?? cella?.ore ?? 0);
                      }, 0)}
                    </Text>
                  </Table.Summary.Cell>
                ))
              : <Table.Summary.Cell index={1} align="center">—</Table.Summary.Cell>
            }
            <Table.Summary.Cell index={isGiornaliero ? giorni.length + 1 : 2} align="right">
              <Text strong>{totalePeriodo}h</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}
