// frontend/src/hooks/usePersonale.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { personaleApi } from '../api/personale';
import { queryKeys } from '../utils/queryKeys';
import type { CostoOrarioPersona, MonteOreAnnuale, Allocazione } from '../types/personale';

export function usePersone(params: { attivo?: boolean; search?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.personale.list(params),
    queryFn: () => personaleApi.list(params).then((r) => r.data),
  });
}

export function usePersona(id: string) {
  return useQuery({
    queryKey: queryKeys.personale.detail(id),
    queryFn: () => personaleApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCostiOrari(personaId: string) {
  return useQuery({
    queryKey: queryKeys.personale.costiOrari(personaId),
    queryFn: () => personaleApi.costiOrari.list(personaId).then((r) => r.data.data),
    enabled: !!personaId,
  });
}

export function useMonteOre(personaId: string) {
  return useQuery({
    queryKey: queryKeys.personale.monteOre(personaId),
    queryFn: () => personaleApi.monteOre.list(personaId).then((r) => r.data.data),
    enabled: !!personaId,
  });
}

export function useMonteOreAnno(personaId: string, anno: number) {
  return useQuery({
    queryKey: queryKeys.personale.monteOreAnno(personaId, anno),
    queryFn: () => personaleApi.monteOre.getAnno(personaId, anno).then((r) => r.data.data),
    enabled: !!personaId && !!anno,
  });
}

export function useInserisciCostoOrario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personaId, data }: { personaId: string; data: Partial<CostoOrarioPersona> }) =>
      personaleApi.costiOrari.create(personaId, data).then((r) => r.data.data),
    onSuccess: (_data, { personaId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.costiOrari(personaId) });
      notification.success({ message: 'Costo orario salvato' });
    },
  });
}

export function useUpsertMonteOre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personaId, anno, ore_disponibili }: { personaId: string; anno: number; ore_disponibili: number }) =>
      personaleApi.monteOre.upsert(personaId, anno, { ore_disponibili }).then((r) => r.data.data),
    onSuccess: (_data, { personaId, anno }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.monteOreAnno(personaId, anno) });
      queryClient.invalidateQueries({ queryKey: queryKeys.personale.monteOre(personaId) });
      notification.success({ message: 'Monte ore aggiornato' });
    },
  });
}

export function useAllocazioni(progettoId: string) {
  return useQuery({
    queryKey: queryKeys.progetti.allocazioni(progettoId),
    queryFn: () => personaleApi.allocazioni.list(progettoId).then((r) => r.data.data),
    enabled: !!progettoId,
  });
}

export function useUpsertAllocazione() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ progettoId, data }: { progettoId: string; data: Partial<Allocazione> }) => {
      if (data.id) {
        return personaleApi.allocazioni.update(data.id, data).then((r) => r.data.data);
      }
      return personaleApi.allocazioni.create(progettoId, data).then((r) => r.data.data);
    },
    onSuccess: (_data, { progettoId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progetti.allocazioni(progettoId) });
      notification.success({ message: 'Allocazione salvata' });
    },
  });
}
