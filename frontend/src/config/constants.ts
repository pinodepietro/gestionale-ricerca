// frontend/src/config/constants.ts

export const STATI_PROGETTO = ['bozza', 'attivo', 'chiuso', 'rendicontato'] as const;
export type StatoProgetto = typeof STATI_PROGETTO[number];

export const STATI_SAL = ['aperto', 'chiuso', 'inviato', 'contestato', 'rendicontato'] as const;
export type StatoSal = typeof STATI_SAL[number];

export const STATI_TIMESHEET = ['bozza', 'inviato', 'attesa_dg', 'approvato', 'rifiutato'] as const;
export type StatoTimesheet = typeof STATI_TIMESHEET[number];

export const STATI_DELIVERABLE = ['atteso', 'consegnato', 'in_ritardo', 'accettato'] as const;
export type StatoDeliverable = typeof STATI_DELIVERABLE[number];

export const RUOLI = ['amministrativo', 'ricercatore', 'management', 'superadmin', 'monitor', 'direttore_generale'] as const;
export type Ruolo = typeof RUOLI[number];

export const TIPI_PROGETTO = ['Horizon Europe', 'PNRR', 'MUR/PRIN', 'MISE', 'Interno', 'Commessa'] as const;
export type TipoProgetto = typeof TIPI_PROGETTO[number];

export const TIPI_RIGA_TIMESHEET = ['progetto', 'altri_progetti', 'ordinaria', 'assenze'] as const;
export type TipoRigaTimesheet = typeof TIPI_RIGA_TIMESHEET[number];

export const EXPORT_FORMATI = ['pdf', 'xlsx', 'xml'] as const;
export type ExportFormato = typeof EXPORT_FORMATI[number];

// Colori badge per stato progetto
export const COLORI_STATO_PROGETTO: Record<StatoProgetto, string> = {
  bozza: 'default',
  attivo: 'green',
  chiuso: 'orange',
  rendicontato: 'blue',
};

// Colori badge per stato SAL
export const COLORI_STATO_SAL: Record<StatoSal, string> = {
  aperto: 'green',
  chiuso: 'orange',
  inviato: 'blue',
  contestato: 'red',
  rendicontato: 'purple',
};

// Soglie colore budget (% utilizzato)
export const SOGLIE_BUDGET = {
  VERDE: 60,    // < 60% → verde
  ARANCIONE: 85, // 60-85% → arancione
  // > 85% → rosso
} as const;
