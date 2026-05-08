// frontend/src/hooks/useSal.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { salApi } from '../api/sal';
import { queryKeys } from '../utils/queryKeys';
import type { Sal } from '../types/budget';

export function useSal(progettoId: string) {
  return useQuery({
    queryKey: queryKeys.sal.byProgetto(progettoId),
    queryFn: () => salApi.list(progettoId).then((r) => r.data),
    enabled: !!progettoId,
  });
}

export function useSalById(id: string) {
  return useQuery({
    queryKey: queryKeys.sal.detail(id),
    queryFn: () => salApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

function useSalTransizione(
  fn: (id: string) => Promise<Sal>,
  successMessage: string,
) {
  const queryClient = useQueryClient();
  const { notification } = App.useApp();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sal.byProgetto(data.progetto_id) });
      queryClient.setQueryData(queryKeys.sal.detail(data.id), data);
      notification.success({ message: successMessage });
    },
  });
}

export function useChiudiSal() {
  return useSalTransizione(
    (id) => salApi.chiudi(id).then((r) => r.data.data),
    'SAL chiuso',
  );
}

export function useInviaSal() {
  return useSalTransizione(
    (id) => salApi.invia(id).then((r) => r.data.data),
    'SAL inviato',
  );
}

export function useContestasal() {
  const queryClient = useQueryClient();
  const { notification } = App.useApp();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      salApi.contesta(id, motivo).then((r) => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sal.byProgetto(data.progetto_id) });
      queryClient.setQueryData(queryKeys.sal.detail(data.id), data);
      notification.success({ message: 'SAL contestato' });
    },
  });
}

export function useRendicontaSal() {
  return useSalTransizione(
    (id) => salApi.rendiconta(id).then((r) => r.data.data),
    'SAL rendicontato',
  );
}

export function useRegistraErogazione() {
  const queryClient = useQueryClient();
  const { notification } = App.useApp();
  return useMutation({
    mutationFn: ({ id, importo_erogato, data_erogazione }: { id: string; importo_erogato: number; data_erogazione: string }) =>
      salApi.registraErogazione(id, { importo_erogato, data_erogazione }).then((r) => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sal.byProgetto(data.progetto_id) });
      queryClient.setQueryData(queryKeys.sal.detail(data.id), data);
      notification.success({ message: 'Erogazione registrata' });
    },
  });
}
