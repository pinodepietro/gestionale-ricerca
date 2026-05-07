// frontend/src/utils/validators.ts
// Validatori condivisi per i form Ant Design.
// Ogni funzione restituisce undefined se valido, stringa di errore se non valido.

export function validaCodiceFiscale(cf: string): string | undefined {
  if (!cf) return undefined; // opzionale
  const re = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i;
  if (!re.test(cf.trim())) return 'Codice fiscale non valido';
  return undefined;
}

export function validaEmail(email: string): string | undefined {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Email non valida';
  return undefined;
}

export function validaImporto(value: number | undefined): string | undefined {
  if (value === undefined || value === null) return 'Importo obbligatorio';
  if (value <= 0) return "L'importo deve essere maggiore di zero";
  if (value > 999_999_999) return 'Importo troppo elevato';
  return undefined;
}

export function validaOre(ore: number | undefined): string | undefined {
  if (ore === undefined || ore === null) return undefined; // le ore possono essere 0
  if (ore < 0) return 'Le ore non possono essere negative';
  if (ore > 24) return 'Le ore non possono superare 24h al giorno';
  return undefined;
}

export function validaDateRange(
  dataInizio: string | undefined,
  dataFine: string | undefined,
): string | undefined {
  if (!dataInizio || !dataFine) return undefined;
  if (new Date(dataFine) <= new Date(dataInizio)) {
    return 'La data di fine deve essere successiva alla data di inizio';
  }
  return undefined;
}

export function validaCUP(cup: string): string | undefined {
  if (!cup) return undefined;
  // CUP: 15 caratteri alfanumerici
  if (!/^[A-Z0-9]{15}$/.test(cup.trim().toUpperCase())) {
    return 'CUP non valido (15 caratteri alfanumerici)';
  }
  return undefined;
}

// Helper per usare i validatori come regole Ant Design Form
export const antdRules = {
  required: (messaggio = 'Campo obbligatorio') => ({
    required: true,
    message: messaggio,
  }),
  importo: {
    validator: (_: unknown, value: number) => {
      const err = validaImporto(value);
      return err ? Promise.reject(err) : Promise.resolve();
    },
  },
  ore: {
    validator: (_: unknown, value: number) => {
      const err = validaOre(value);
      return err ? Promise.reject(err) : Promise.resolve();
    },
  },
  codiceFiscale: {
    validator: (_: unknown, value: string) => {
      const err = validaCodiceFiscale(value);
      return err ? Promise.reject(err) : Promise.resolve();
    },
  },
  cup: {
    validator: (_: unknown, value: string) => {
      const err = validaCUP(value);
      return err ? Promise.reject(err) : Promise.resolve();
    },
  },
};
