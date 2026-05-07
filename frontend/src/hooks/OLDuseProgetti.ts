// frontend/src/hooks/useProgetti.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { progettiApi, type ProgettoFilters } from '../api/progetti';
import { queryKeys } from '../utils/queryKeys';

export function useProgetti(filters: ProgettoFilters = {}) {
  return useQuery({
    queryKey: queryKeys.progetti.list(filters),
    queryFn: () => progettiApi.list(filters).then((r) => r.data),
  });
}

export function useProgetto(id: string) {
  return useQuery({
    queryKey: queryKeys.progetti.detail(id),
    queryFn: () => progettiApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCruscotto(id: string) {
  return useQuery({
    queryKey: queryKeys.progetti.cruscotto(id),
    queryFn: () => progettiApi.cruscotto(id).then((r) => r.data.data),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // cruscotto si aggiorna ogni 2 minuti
  });
}

export function useAttivaProgetto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => progettiApi.attiva(id).then((r) => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.all });
      queryClient.setQueryData(queryKeys.progetti.detail(data.id), data);
      notification.success({ message: 'Progetto attivato con successo' });
    },
  });
}

export function useChiudiProgetto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => progettiApi.chiudi(id).then((r) => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.all });
      queryClient.setQueryData(queryKeys.progetti.detail(data.id), data);
      notification.success({ message: 'Progetto chiuso' });
    },
  });
}

export function useDocumentiProgetto(progettoId: string) {
  return useQuery({
    queryKey: queryKeys.progetti.documenti(progettoId),
    queryFn: () => progettiApi.documenti.list(progettoId).then((r) => r.data.data),
    enabled: !!progettoId,
  });
}
