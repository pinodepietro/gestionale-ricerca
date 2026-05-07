// frontend/src/hooks/useBudget.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { budgetApi } from '../api/budget';
import { queryKeys } from '../utils/queryKeys';
import type { Spesa } from '../types/budget';

export function useBudgetVoci(progettoId: string) {
  return useQuery({
    queryKey: queryKeys.progetti.budget(progettoId),
    queryFn: () => budgetApi.voci.list(progettoId).then((r) => r.data.data),
    enabled: !!progettoId,
  });
}

export function useSpese(progettoId: string, params: { sal_id?: string; voce_id?: string; page?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.progetti.spese(progettoId, params),
    queryFn: () => budgetApi.spese.list(progettoId, params).then((r) => r.data),
    enabled: !!progettoId,
  });
}

export function useRegistraSpesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ progettoId, data }: { progettoId: string; data: Partial<Spesa> }) =>
      budgetApi.spese.create(progettoId, data).then((r) => r.data.data),
    onSuccess: (_data, { progettoId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.spese(progettoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: 'Spesa registrata' });
    },
  });
}

export function useRettificaSpesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      progettoId,
      spesaOrigineId,
      data,
    }: {
      progettoId: string;
      spesaOrigineId: string;
      data: Partial<Spesa>;
    }) => budgetApi.spese.rettifica(progettoId, spesaOrigineId, data).then((r) => r.data.data),
    onSuccess: (_data, { progettoId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.spese(progettoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.budget(progettoId) });
      notification.success({ message: 'Nota di credito registrata' });
    },
  });
}
