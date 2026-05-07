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
  | 'timesheet:compila'
  | 'timesheet:approva'            // PI — prima firma
  | 'timesheet:firma_2'            // seconda firma (es. Direttore Istituto)
  | 'timesheet:visualizza_tutti'   // tutti i timesheet, non solo i propri
  | 'sal:crea'
  | 'sal:invia'
  | 'sal:contesta'
  | 'sal:rendiconta'
  | 'sal:registra_erogazione'
  | 'personale:visualizza'
  | 'personale:gestisci'           // crea/modifica persone, costi orari, monte ore
  | 'partner:gestisci'
  | 'config:gestisci'             // tipi finanziamento, voci di costo, template
  | 'documento:carica';            // upload documenti progetto

const PERMESSI: Record<Azione, Ruolo[]> = {
  'progetto:crea':               ['amministrativo'],
  'progetto:attiva':             ['amministrativo'],
  'progetto:chiudi':             ['amministrativo'],
  'progetto:modifica':           ['amministrativo'],
  'configurazione:accedi':       ['amministrativo'],

  'spesa:registra':              ['amministrativo', 'pi'],
  'spesa:annulla':               ['amministrativo'],
  'spesa:visualizza_tutte':      ['amministrativo', 'management'],

  'timesheet:compila':           ['ricercatore', 'pi', 'amministrativo'],
  'timesheet:approva':           ['pi'],
  'timesheet:firma_2':           ['amministrativo'],
  'timesheet:visualizza_tutti':  ['amministrativo', 'management'],

  'sal:crea':                    ['amministrativo'],
  'sal:invia':                   ['amministrativo'],
  'sal:contesta':                ['amministrativo'],
  'sal:rendiconta':              ['amministrativo'],
  'sal:registra_erogazione':     ['amministrativo'],

  'personale:visualizza':        ['amministrativo', 'pi', 'management', 'superadmin'],
  'personale:gestisci':          ['amministrativo', 'superadmin'],
  'partner:gestisci':            ['amministrativo'],
  'config:gestisci':             ['amministrativo'],
  'documento:carica':            ['amministrativo', 'pi'],
};

export function canDo(ruolo: Ruolo, azione: Azione): boolean {
  return PERMESSI[azione].includes(ruolo);
}
