// Estrae il messaggio leggibile da un errore API FastAPI
export function apiErrorMessage(error: unknown, fallback = 'Operazione fallita'): string {
  const msg = (error as { response?: { data?: { detail?: { error?: { message?: string } } | string } } })
    ?.response?.data?.detail;
  if (typeof msg === 'string') return msg;
  if (msg?.error?.message) return msg.error.message;
  return fallback;
}
