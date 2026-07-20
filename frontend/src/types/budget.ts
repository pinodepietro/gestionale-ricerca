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
  wp_id?: string | null;
  voce?: { codice: string; descrizione: string; categoria?: string };
  importo_previsto: number;
  importo_erogato: number;
  importo_rendicontato: number;
  importo_impegnato: number;
  importo_speso: number;
  importo_disponibile: number;
  importo_residuo: number;
  percentuale_utilizzata: number;
}

export interface Impegno {
  id: string;
  progetto_id: string;
  voce_id: string;
  wp_id?: string | null;
  voce?: { codice: string; descrizione: string };
  data: string;
  descrizione: string;
  importo: number;
  stabilizzato?: boolean;
  created_at?: string;
}

export interface Spesa {
  id: string;
  progetto_id: string;
  voce_id: string;
  wp_id?: string | null;
  persona_id?: string;
  partner_id?: string;
  importo: number;
  data: string;
  data_documento?: string;
  numero_documento?: string;
  descrizione?: string;
  stato: 'registrata';
  rendicontata: boolean;
  allegato_path?: string;
  sal_id?: string;
  impegno_id?: string;
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
