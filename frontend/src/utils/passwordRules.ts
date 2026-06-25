// frontend/src/utils/passwordRules.ts
import type { RuleObject } from 'antd/es/form';

export const SPECIAL_CHARS_LABEL = '! @ # $ % ^ & * ( ) _ - + = { } [ ] ; : , . ?';
const SPECIAL_RE = /[!@#$%^&*()\-_+=[\]{};:,.?]/;

function validatePassword(value: string): string | null {
  if (!value || value.length < 8) return 'Almeno 8 caratteri';
  if (!/[A-Z]/.test(value)) return 'Almeno una lettera maiuscola';
  if (!/[a-z]/.test(value)) return 'Almeno una lettera minuscola';
  if (!/\d/.test(value)) return 'Almeno un numero';
  if (!SPECIAL_RE.test(value)) return `Almeno un carattere speciale tra: ${SPECIAL_CHARS_LABEL}`;
  return null;
}

export const passwordRules: RuleObject[] = [
  { required: true, message: 'Inserisci la nuova password' },
  {
    validator: (_: RuleObject, value: string) => {
      const err = validatePassword(value);
      return err ? Promise.reject(new Error(err)) : Promise.resolve();
    },
  },
];
