// frontend/src/types/personale.ts

export interface Persona {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  codice_fiscale?: string;
  ruolo?: string;
  ruolo_ente?: string;
  livello_contratto?: string;
  data_inizio_servizio?: string;
  ssd?: string;
  dipartimento_id?: string | null;
  dipartimento_nome?: string | null;
  attivo: boolean;
}

export interface CostoOrarioPersona {
  id: string;
  persona_id: string;
  costo_orario: number;
  data_inizio: string;
  data_fine?: string;
  motivazione?: string;
  inserito_da: string;
  created_at: string;
}

export interface MonteOreAnnuale {
  id: string;
  persona_id: string;
  anno: number;
  ore_disponibili: number;
  ore_allocate: number;
  ore_residue: number;
}

export interface Allocazione {
  id: string;
  persona_id: string;
  progetto_id: string;
  ore_assegnate: number;
  data_inizio: string;
  data_fine: string;
  note?: string;
}
