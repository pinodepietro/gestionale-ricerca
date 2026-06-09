// frontend/src/types/proposta.ts

export type StatoProposta = 'in_preparazione' | 'sottomessa' | 'approvata' | 'rigettata';

export interface PropostaPartner {
  id: string;
  proposta_id: string;
  denominazione: string;
  tipologia: string;
  ruolo: string;
  nazionalita?: string;
  sito_web?: string;
}

export interface PersonaMini {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ssd?: string;
}

export interface Proposta {
  id: string;
  acronimo: string;
  titolo: string;
  bando: string;
  data_scadenza_bando: string;
  responsabile_scientifico?: PersonaMini;
  descrizione?: string;
  data_inizio_prevista?: string;
  durata_mesi?: number;
  costo_totale?: number;
  importo_finanziato?: number;
  importo_cofinanziato?: number;
  importo_personale_interno?: number;
  importo_overhead?: number;
  percentuale_overhead?: number;
  stato: StatoProposta;
  created_by: string;
  created_at: string;
  updated_at: string;
  partner?: PropostaPartner[];
}
