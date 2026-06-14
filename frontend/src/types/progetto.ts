// frontend/src/types/progetto.ts
import type { StatoProgetto, TipoProgetto } from '../config/constants';

export interface Progetto {
  id: string;
  codice: string;
  titolo: string;
  acronimo: string;
  descrizione?: string;
  tipo: TipoProgetto;
  data_inizio: string;
  data_fine: string;
  data_fine_rendicontazione?: string;
  stato: StatoProgetto;
  costo_totale: number;
  importo_finanziato: number;
  quota_cofinanziamento: number;
  percentuale_finanziamento: number;
  cup?: string;
  budget_per_partner: boolean;
  template_timesheet_id?: string;
  note?: string;
  pi_id?: string | null;
  pi_nome?: string;
  amministrativo_nome?: string;
  amministrativo_id?: string;
  dipartimento_id?: string | null;
  dipartimento_nome?: string | null;
}

export interface DocumentoProgetto {
  id: string;
  progetto_id: string;
  tipo_documento: 'proposta' | 'contratto' | 'emendamento' | 'relazione' | 'altro';
  nome_file: string;
  path_file: string;
  versione?: string;
  descrizione?: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface TipoFinanziamento {
  id: string;
  nome: string;
  categoria: 'europeo' | 'nazionale' | 'regionale' | 'privato';
  ente_erogante: string;
  template_timesheet_id?: string;
  note_rendicontazione?: string;
}

export interface Finanziamento {
  id: string;
  progetto_id: string;
  tipo_id: string;
  importo: number;
  riferimento_contratto?: string;
  data_stipula?: string;
}

export interface Partner {
  id: string;
  nome: string;
  codice_fiscale?: string;
  tipo: 'università' | 'ente_pubblico' | 'impresa' | 'no_profit';
  paese: string;
  referente_nome?: string;
  referente_email?: string;
}

export interface ProgettoPartner {
  id: string;
  progetto_id: string;
  partner_id: string;
  ruolo: 'capofila' | 'partner' | 'associato';
  budget_assegnato?: number;
}

// Tipo per il cruscotto progetto
export interface PortfolioProgetto {
  id: string;
  codice: string;
  acronimo: string;
  titolo: string;
  tipo: string;
  data_inizio: string | null;
  data_fine: string | null;
  costo_totale: number;
  importo_finanziato: number;
  pianificato: number;
  rendicontato: number;
  pct_rendicontato: number;
  pct_speso: number;
  percentuale_tempo: number;
  spese_documentate: number;
  pi_nome: string | null;
}

export interface PortfolioGlobale {
  progetti_attivi: number;
  costo_totale_portfolio: number;
  importo_finanziato_portfolio: number;
  budget_pianificato: number;
  budget_rendicontato: number;
  pct_rendicontato: number;
  spese_totali: number;
  pct_speso: number;
  timesheet_pendenti: number;
  sal_in_scadenza: number;
  progetti: PortfolioProgetto[];
}

export interface CruscottoProgetto {
  progetto_id: string;
  ore_allocate_totali: number;
  ore_consuntivate_totali: number;
  spese_totali_rendicontate: number;
  spese_totali_previste: number;
  milestone_in_ritardo: number;
  deliverable_in_ritardo: number;
  timesheet_pendenti: number;
  sal_in_scadenza: number;
}
