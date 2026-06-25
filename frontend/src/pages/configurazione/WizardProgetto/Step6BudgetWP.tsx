import { useState, useEffect } from 'react';
import { Button, InputNumber, Table, Typography, Row, Col, Divider, App, Alert } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { queryKeys } from '../../../utils/queryKeys';
import { formatEuro } from '../../../utils/formatters';
import type { WorkPackage } from '../../../types/struttura';

const { Title, Text } = Typography;

interface Props {
  progettoId: string;
  onCompletato: () => void;
  onIndietro?: () => void;
}

interface VoceRow {
  voce_id: string;
  label: string;
  importo_previsto: number;
}

interface BudgetVoceRaw {
  voce_id: string;
  wp_id: string | null;
  importo_previsto: number;
  voce?: { codice: string; descrizione: string };
}

export function Step6BudgetWP({ progettoId, onCompletato, onIndietro }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();

  const { data: tuttoIlBudget } = useQuery({
    queryKey: queryKeys.progetti.budget(progettoId),
    queryFn: () => progettiApi.budget.list(progettoId).then(r => r.data.data as BudgetVoceRaw[]),
  });

  const { data: wps } = useQuery({
    queryKey: ['wp', progettoId],
    queryFn: () => progettiApi.wp.list(progettoId).then(r => r.data.data as WorkPackage[]),
  });

  // { [voce_id]: { [wp_id]: importo } }
  const [values, setValues] = useState<Record<string, Record<string, number>>>({});
  const [inizializzato, setInizializzato] = useState(false);

  const vociBudgetProj: VoceRow[] = (tuttoIlBudget ?? [])
    .filter(bv => bv.wp_id === null)
    .map(bv => ({
      voce_id: bv.voce_id,
      label: bv.voce ? `${bv.voce.codice} — ${bv.voce.descrizione}` : bv.voce_id,
      importo_previsto: bv.importo_previsto,
    }));

  useEffect(() => {
    if (inizializzato || !tuttoIlBudget) return;
    const init: Record<string, Record<string, number>> = {};
    (tuttoIlBudget as BudgetVoceRaw[])
      .filter(bv => bv.wp_id !== null)
      .forEach(bv => {
        if (!init[bv.voce_id]) init[bv.voce_id] = {};
        init[bv.voce_id][bv.wp_id!] = bv.importo_previsto;
      });
    setValues(init);
    setInizializzato(true);
  }, [tuttoIlBudget, inizializzato]);

  function handleChange(voce_id: string, wp_id: string, val: number) {
    setValues(prev => ({
      ...prev,
      [voce_id]: { ...(prev[voce_id] ?? {}), [wp_id]: val },
    }));
  }

  function residuo(voce_id: string, importo_previsto: number) {
    const allocato = (wps ?? []).reduce((s, wp) => s + (values[voce_id]?.[wp.id] ?? 0), 0);
    return importo_previsto - allocato;
  }

  const tuttiRipartiti = vociBudgetProj.length > 0 && (wps ?? []).length > 0 &&
    vociBudgetProj.every(r => Math.abs(residuo(r.voce_id, r.importo_previsto)) < 0.01);

  const { mutate: salva, isPending } = useMutation({
    mutationFn: () => {
      const payload: { voce_id: string; wp_id: string; importo_previsto: number }[] = [];
      for (const voce of vociBudgetProj) {
        for (const wp of (wps ?? [])) {
          const importo = values[voce.voce_id]?.[wp.id] ?? 0;
          if (importo > 0) payload.push({ voce_id: voce.voce_id, wp_id: wp.id, importo_previsto: importo });
        }
      }
      return progettiApi.budget.salvaWP(progettoId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      onCompletato();
    },
    onError: () => notification.error({ message: 'Errore durante il salvataggio del budget WP' }),
  });

  const wpColonne = (wps ?? []).map(wp => ({
    title: <span title={wp.titolo}>{wp.codice}</span>,
    key: wp.id,
    width: 120,
    align: 'right' as const,
    render: (_: unknown, r: VoceRow) => (
      <InputNumber
        value={values[r.voce_id]?.[wp.id] ?? 0}
        min={0}
        precision={2}
        style={{ width: '100%' }}
        controls={false}
        onChange={v => handleChange(r.voce_id, wp.id, v ?? 0)}
      />
    ),
  }));

  const colonne = [
    { title: 'Voce di costo', dataIndex: 'label', ellipsis: true },
    {
      title: 'Totale progetto', dataIndex: 'importo_previsto', width: 140,
      align: 'right' as const,
      render: formatEuro,
    },
    ...wpColonne,
    {
      title: 'Residuo', key: 'residuo', width: 120, align: 'right' as const,
      render: (_: unknown, r: VoceRow) => {
        const res = residuo(r.voce_id, r.importo_previsto);
        const ok = Math.abs(res) < 0.01;
        return <Text type={ok ? 'success' : 'danger'} strong={!ok}>{formatEuro(res)}</Text>;
      },
    },
  ];

  if (!wps || wps.length === 0) {
    return (
      <Alert type="warning" showIcon
        message="Nessun Work Package definito"
        description="Torna allo Step 4 e crea almeno un Work Package prima di continuare."
        action={<Button onClick={onIndietro}>← Indietro</Button>}
      />
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 8 }}>Ripartizione budget per Work Package</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Distribuisci l'importo di ciascuna voce sui Work Package. Il residuo di ogni riga deve arrivare a <strong>€ 0,00</strong> per procedere.
      </Text>

      <Table
        columns={colonne}
        dataSource={vociBudgetProj}
        rowKey="voce_id"
        pagination={false}
        size="small"
        bordered
        scroll={{ x: true }}
        locale={{ emptyText: 'Nessuna voce di budget definita (completare Step 2)' }}
      />

      <Divider />
      <Row justify="space-between">
        <Col>{onIndietro && <Button onClick={onIndietro}>← Indietro</Button>}</Col>
        <Col>
          <Button
            type="primary"
            disabled={!tuttiRipartiti}
            loading={isPending}
            onClick={() => salva()}
          >
            {onIndietro ? 'Salva e continua →' : 'Salva'}
          </Button>
        </Col>
      </Row>
      {!tuttiRipartiti && vociBudgetProj.length > 0 && (
        <Alert type="info" showIcon style={{ marginTop: 12 }}
          message="Completa la ripartizione: il residuo di ogni voce deve essere € 0,00" />
      )}
    </div>
  );
}
