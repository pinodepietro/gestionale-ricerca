// frontend/src/types/timesheet.ts
import type { StatoTimesheet, TipoRigaTimesheet, ExportFormato } from '../config/constants';

export interface TemplateTimesheet {
  id: string;
  nome: string;
  granularita: 'mensile' | 'giornaliero';
  righe_wp_task: boolean;
  riga_altri_progetti: boolean;
  riga_ordinaria: boolean;
  riga_assenze: boolean;
  num_firmatari: 1 | 2 | 3;
  etichetta_firmatario_1: string;
  etichetta_firmatario_2?: string;
  etichetta_firmatario_3?: string;
}

export interface TimesheetTestata {
  id: string;
  persona_id: string;
  progetto_id: string;
  template_id: string;
  anno: number;
  mese: number;
  sal_id?: string;
  stato: StatoTimesheet;
  inviato_at?: string;
  approvato_at?: string;
  motivazione_rifiuto?: string;
  granularita?: 'mensile' | 'giornaliero';
  righe?: TimesheetRiga[];
  // campi calcolati per la UI
  ore_totali_progetto?: number;
  ore_totali?: number;
}

export interface TimesheetRiga {
  id: string;
  testata_id: string;
  tipo_riga: TipoRigaTimesheet;
  wp_id?: string;
  task_id?: string;
  progetto_correlato_id?: string;
  descrizione_libera?: string;
  ordine: number;
  celle: TimesheetCella[];
}

export interface TimesheetCella {
  id: string;
  riga_id: string;
  giorno: number;         // 0 = totale mese, 1-31 per giornaliero
  ore: number;
  costo_orario_applicato?: number;   // valorizzato dopo approvazione
  costo_calcolato?: number;          // valorizzato dopo approvazione
}

export interface ApprovazioneTimesheet {
  id: string;
  testata_id: string;
  approvatore_id: string;
  ruolo_firma: string;
  ordine_firma: number;
  esito: 'approvato' | 'rifiutato';
  data: string;
  note?: string;
}

// Payload per PUT /timesheet/{id}/righe
export interface TimesheetRigaPayload {
  tipo_riga: TipoRigaTimesheet;
  wp_id?: string;
  task_id?: string;
  progetto_correlato_id?: string;
  descrizione_libera?: string;
  ordine: number;
  celle: TimesheetCellaPayload[];
}

export interface TimesheetCellaPayload {
  giorno: number;
  ore: number;
}

export interface TimesheetRighePayload {
  righe: TimesheetRigaPayload[];
}

// Payload per export
export interface ExportTimesheetRequest {
  formato: ExportFormato;
}

export interface ExportSalRequest {
  formato: ExportFormato;
  includi_timesheet: boolean;
  includi_spese: boolean;
}
