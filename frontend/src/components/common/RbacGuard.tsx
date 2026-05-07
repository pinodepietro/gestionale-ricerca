// frontend/src/components/common/RbacGuard.tsx
// Wrapper che mostra i figli solo se il ruolo corrente ha il permesso richiesto.
// Uso: <RbacGuard azione="progetto:attiva"><Button>Attiva</Button></RbacGuard>

import type { ReactNode } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { canDo, type Azione } from '../../utils/rbac';

interface Props {
  azione: Azione;
  fallback?: ReactNode;   // cosa mostrare se non autorizzato (default: nulla)
  children: ReactNode;
}

export function RbacGuard({ azione, fallback = null, children }: Props) {
  const user = useAuthStore((state) => state.user);

  if (!user || !canDo(user.ruolo, azione)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
