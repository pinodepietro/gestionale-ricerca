import { useState, useEffect } from 'react';
import { Button, InputNumber, Table, Typography, Row, Col, Divider, App, Alert } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progettiApi } from '../../../api/progetti';
import { queryKeys } from '../../../utils/queryKeys';
import { formatOre } from '../../../utils/formatters';
import type { WorkPackage } from '../../../types/struttura';

const { Title, Text } = Typography;

interface Props {
  progettoId: string;
  onCompletato: () => void;
  onIndietro?: () => void;
}

interface PersonaRow {
  persona_id: string;
  label: string;
  ore_assegnate: number;
}

interface AllocazioneRaw {
  id: string;
  persona_id: string;
  wp_id: string | null;
  ore_assegnate: number;
  persona?: { nome: string; cognome: string };
}

export function Step7PersonaleWP({ progettoId, onCompletato, onIndietro }: Props) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();

  const { data: tutteLeAllocazioni } = useQuery({
    queryKey: queryKeys.progetti.allocazioni(progettoId),
    queryFn: () => progettiApi.allocazioni.list(progettoId).then(r => r.data.data as AllocazioneRaw[]),
  });

  const { data: wps } = useQuery({
    queryKey: ['wp', progettoId],
    queryFn: () => progettiApi.wp.list(progettoId).then(r => r.data.data as WorkPackage[]),
  });

  // { [persona_id]: { [wp_id]: ore } }
  const [values, setValues] = useState<Record<string, Record<string, number>>>({});
  const [inizializzato, setInizializzato] = useState(false);

  const personaRows: PersonaRow[] = (tutteLeAllocazioni ?? [])
    .filter(a => a.wp_id === null)
    .map(a => ({
      persona_id: a.persona_id,
      label: a.persona ? `${a.persona.cognome} ${a.persona.nome}` : a.persona_id,
      ore_assegnate: a.ore_assegnate,
    }));

  useEffect(() => {
    if (inizializzato || !tutteLeAllocazioni) return;
    const init: Record<string, Record<string, number>> = {};
    (tutteLeAllocazioni as AllocazioneRaw[])
      .filter(a => a.wp_id !== null)
      .forEach(a => {
        if (!init[a.persona_id]) init[a.persona_id] = {};
        init[a.persona_id][a.wp_id!] = a.ore_assegnate;
      });
    setValues(init);
    setInizializzato(true);
  }, [tutteLeAllocazioni, inizializzato]);

  function handleChange(persona_id: string, wp_id: string, val: number) {
    setValues(prev => ({
      ...prev,
      [persona_id]: { ...(prev[persona_id] ?? {}), [wp_id]: val },
    }));
  }

  function residuo(persona_id: string, ore_assegnate: number) {
    const allocate = (wps ?? []).reduce((s, wp) => s + (values[persona_id]?.[wp.id] ?? 0), 0);
    return ore_assegnate - allocate;
  }

  const tuttiRipartiti = personaRows.length > 0 && (wps ?? []).length > 0 &&
    personaRows.every(r => Math.abs(residuo(r.persona_id, r.ore_assegnate)) < 0.01);

  const { mutate: salva, isPending } = useMutation({
    mutationFn: () => {
      const payload: { persona_id: string; wp_id: string; ore_assegnate: number }[] = [];
      for (const persona of personaRows) {
        for (const wp of (wps ?? [])) {
          const ore = values[persona.persona_id]?.[wp.id] ?? 0;
          if (ore > 0) payload.push({ persona_id: persona.persona_id, wp_id: wp.id, ore_assegnate: ore });
        }
      }
      return progettiApi.allocazioni.salvaWP(progettoId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.allocazioni(progettoId) });
      onCompletato();
    },
    onError: () => notification.error({ message: 'Errore durante il salvataggio delle allocazioni WP' }),
  });

  const wpColonne = (wps ?? []).map(wp => ({
    title: <span title={wp.titolo}>{wp.codice}</span>,
    key: wp.id,
    width: 120,
    align: 'right' as const,
    render: (_: unknown, r: PersonaRow) => (
      <InputNumber
        value={values[r.persona_id]?.[wp.id] ?? 0}
        min={0}
        precision={2}
        style={{ width: '100%' }}
        controls={false}
        onChange={v => handleChange(r.persona_id, wp.id, v ?? 0)}
      />
    ),
  }));

  const colonne = [
    { title: 'Persona', dataIndex: 'label', ellipsis: true },
    {
      title: 'Ore totali', dataIndex: 'ore_assegnate', width: 110,
      align: 'right' as const,
      render: formatOre,
    },
    ...wpColonne,
    {
      title: 'Residuo', key: 'residuo', width: 110, align: 'right' as const,
      render: (_: unknown, r: PersonaRow) => {
        const res = residuo(r.persona_id, r.ore_assegnate);
        const ok = Math.abs(res) < 0.01;
        return <Text type={ok ? 'success' : 'danger'} strong={!ok}>{formatOre(res)}</Text>;
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
      <Title level={4} style={{ marginBottom: 8 }}>Ripartizione ore personale per Work Package</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Distribuisci le ore di ogni persona sui Work Package. Il residuo di ogni riga deve arrivare a <strong>0h</strong> per procedere.
      </Text>

      <Table
        columns={colonne}
        dataSource={personaRows}
        rowKey="persona_id"
        pagination={false}
        size="small"
        bordered
        scroll={{ x: true }}
        locale={{ emptyText: 'Nessuna persona allocata (completare Step 5)' }}
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
            {onIndietro ? 'Completa configurazione ✓' : 'Salva'}
          </Button>
        </Col>
      </Row>
      {!tuttiRipartiti && personaRows.length > 0 && (
        <Alert type="info" showIcon style={{ marginTop: 12 }}
          message="Completa la ripartizione: il residuo di ogni persona deve essere 0h" />
      )}
    </div>
  );
}
