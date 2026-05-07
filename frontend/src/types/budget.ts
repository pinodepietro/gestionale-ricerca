// frontend/src/types/budget.ts
import type { StatoSal } from '../config/constants';

export interface VoceDiCosto {
  id: string;
  codice: string;
  descrizione: string;
  categoria: 'personale' | 'materiali' | 'servizi' | 'missioni' | 'overhead' | 'altro';
  ammissibile_horizon: boolean;
  ammissibile_pnrr: boolean;
  ammissibile_por: boolean;
}

export interface BudgetVoce {
  id: string;
  progetto_id: string;
  voce_id: string;
  partner_id?: string;
  importo_previsto: number;
  importo_rendicontato: number;
  importo_residuo: number;
  // campi calcolati per la UI
  percentuale_utilizzata: number;
}

export interface Spesa {
  id: string;
  progetto_id: string;
  voce_id: string;
  persona_id?: string;
  partner_id?: string;
  importo: number;
  data: string;
  numero_documento?: string;
  descrizione?: string;
  stato: 'registrata' | 'annullata';
  allegato_path?: string;
  sal_id?: string;
  spesa_origine_id?: string;   // valorizzato se è una nota di credito
  created_at: string;
  created_by: string;
}

export interface Sal {
  id: string;
  progetto_id: string;
  numero: number;
  data_inizio: string;
  data_fine: string;
  stato: StatoSal;
  importo_tranche?: number;
  importo_erogato?: number;
  data_erogazione?: string;
  data_scadenza_rendiconto?: string;
  motivo_contestazione?: string;
}
