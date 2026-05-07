// frontend/src/types/struttura.ts

export interface WorkPackage {
  id: string;
  progetto_id: string;
  codice: string;
  titolo: string;
  descrizione?: string;
  data_inizio: string;
  data_fine: string;
  partner_lead_id?: string;
  responsabile_id?: string;
  stato: 'pianificato' | 'in_corso' | 'completato';
}

export interface Task {
  id: string;
  wp_id: string;
  codice: string;
  titolo: string;
  descrizione?: string;
  data_inizio: string;
  data_fine: string;
  stato: 'pianificato' | 'in_corso' | 'completato';
  responsabile_id?: string;
}

export interface Deliverable {
  id: string;
  progetto_id: string;
  wp_id?: string;
  codice: string;
  titolo: string;
  tipo: 'report' | 'software' | 'dataset' | 'prototipo' | 'altro';
  data_scadenza: string;
  data_consegna?: string;
  stato: 'atteso' | 'consegnato' | 'in_ritardo' | 'accettato';
  responsabile_id?: string;
  path_file?: string;
}

export interface Milestone {
  id: string;
  progetto_id: string;
  wp_id?: string;
  codice: string;
  titolo: string;
  data_prevista: string;
  data_effettiva?: string;
  stato: 'attesa' | 'raggiunta' | 'in_ritardo';
}
