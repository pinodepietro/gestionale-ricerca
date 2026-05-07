// frontend/src/i18n/it.ts
// Stringhe UI centralizzate in italiano.
// Da espandere man mano che si aggiungono schermate.

export const it = {
  comune: {
    salva: 'Salva',
    annulla: 'Annulla',
    conferma: 'Conferma',
    elimina: 'Elimina',
    modifica: 'Modifica',
    chiudi: 'Chiudi',
    caricamento: 'Caricamento...',
    nessunRisultato: 'Nessun risultato',
    erroreGenerico: 'Si è verificato un errore. Riprova.',
  },
  progetto: {
    nuovo: 'Nuovo progetto',
    attiva: 'Attiva progetto',
    chiudi: 'Chiudi progetto',
    stati: {
      attivo: 'Attivo',
      chiuso: 'Chiuso',
      rendicontato: 'Rendicontato',
    },
  },
  sal: {
    stati: {
      aperto: 'Aperto',
      chiuso: 'Chiuso',
      inviato: 'Inviato',
      contestato: 'Contestato',
      rendicontato: 'Rendicontato',
    },
    chiudi: 'Chiudi SAL',
    invia: 'Invia SAL',
    contesta: 'Contesta',
    rendiconta: 'Rendiconta',
  },
  timesheet: {
    stati: {
      bozza: 'Bozza',
      inviato: 'Inviato',
      approvato: 'Approvato',
      rifiutato: 'Rifiutato',
    },
    invia: 'Invia per approvazione',
    approva: 'Approva',
    rifiuta: 'Rifiuta',
  },
  spesa: {
    registra: 'Registra spesa',
    rettifica: 'Nota di credito',
  },
} as const;
