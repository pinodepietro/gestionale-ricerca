// frontend/src/utils/formatters.ts

const euroFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatEuro(value: number | null | undefined): string {
  if (value == null) return '—';
  return euroFormatter.format(value);
}

export function formatOre(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${numberFormatter.format(value)} h`;
}

export function formatPercentuale(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${numberFormatter.format(value)}%`;
}

export function formatData(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatMeseAnno(mese: number, anno: number): string {
  return new Date(anno, mese - 1).toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  });
}

// Restituisce 'green' | 'orange' | 'red' in base alla % di budget utilizzato
export function coloreBudget(percentuale: number): 'green' | 'orange' | 'red' {
  if (percentuale < 60) return 'green';
  if (percentuale <= 85) return 'orange';
  return 'red';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
