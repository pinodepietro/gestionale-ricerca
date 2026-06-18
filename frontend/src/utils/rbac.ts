// frontend/src/utils/rbac.ts
// Unica fonte di verità per i permessi frontend.
// Ogni azione deve avere una corrispondente voce nel backend.

import type { Ruolo } from '../config/constants';

export type Azione =
  | 'progetto:crea'
  | 'progetto:attiva'
  | 'progetto:chiudi'
  | 'progetto:modifica'
  | 'configurazione:accedi'        // sezione "In configurazione" sidebar
  | 'spesa:registra'
  | 'spesa:annulla'
  | 'spesa:visualizza_tutte'       // tutti i progetti, non solo i propri
  | 'timesheet:accedi'             // voce di menu Timesheet nella sidebar
  | 'timesheet:compila'
  | 'timesheet:approva'            // PI — prima firma
  | 'timesheet:firma_2'            // seconda firma (es. Direttore Istituto)
  | 'timesheet:visualizza_tutti'   // tutti i timesheet, non solo i propri
  | 'sal:visualizza'
  | 'sal:esporta'
  | 'sal:crea'
  | 'sal:invia'
  | 'sal:contesta'
  | 'sal:rendiconta'
  | 'sal:registra_erogazione'
  | 'personale:visualizza'
  | 'personale:gestisci'           // crea/modifica persone, costi orari, monte ore
  | 'partner:gestisci'
  | 'config:gestisci'             // tipi finanziamento, voci di costo, template
  | 'documento:carica'             // upload documenti progetto
  | 'proposta:crea'                // qualsiasi utente autenticato
  | 'proposta:converti'            // solo amministrativo/superadmin
  | 'dipartimento:gestisci';       // crea/modifica/elimina dipartimenti — solo superadmin

const PERMESSI: Record<Azione, Ruolo[]> = {
  'progetto:crea':               ['superadmin'],
  'progetto:attiva':             ['amministrativo', 'superadmin'],
  'progetto:chiudi':             ['amministrativo', 'superadmin'],
  'progetto:modifica':           ['amministrativo', 'superadmin'],
  'configurazione:accedi':       ['amministrativo', 'superadmin'],

  'spesa:registra':              ['amministrativo', 'ricercatore', 'superadmin'],
  'spesa:annulla':               ['amministrativo'],
  'spesa:visualizza_tutte':      ['amministrativo', 'management', 'monitor'],

  'timesheet:accedi':            ['ricercatore', 'amministrativo', 'management', 'superadmin'],
  'timesheet:compila':           ['ricercatore'],
  'timesheet:approva':           ['ricercatore', 'superadmin'],
  'timesheet:firma_2':           ['amministrativo'],
  'timesheet:visualizza_tutti':  ['amministrativo', 'management', 'monitor'],

  'sal:visualizza':              ['amministrativo', 'superadmin', 'management', 'ricercatore', 'monitor'],
  'sal:esporta':                 ['amministrativo', 'superadmin', 'management', 'ricercatore'],
  'sal:crea':                    ['amministrativo', 'superadmin'],
  'sal:invia':                   ['amministrativo', 'superadmin'],
  'sal:contesta':                ['amministrativo', 'superadmin'],
  'sal:rendiconta':              ['amministrativo', 'superadmin'],
  'sal:registra_erogazione':     ['amministrativo', 'superadmin'],

  'personale:visualizza':        ['amministrativo', 'management', 'superadmin', 'monitor'],
  'personale:gestisci':          ['amministrativo', 'superadmin'],
  'partner:gestisci':            ['amministrativo'],
  'config:gestisci':             ['amministrativo'],
  'documento:carica':            ['amministrativo', 'ricercatore', 'superadmin'],
  'proposta:crea':               ['amministrativo', 'ricercatore', 'management', 'superadmin'],
  'proposta:converti':           ['amministrativo', 'superadmin'],
  'dipartimento:gestisci':       ['superadmin'],
};

export function canDo(ruolo: Ruolo, azione: Azione): boolean {
  return PERMESSI[azione].includes(ruolo);
}
