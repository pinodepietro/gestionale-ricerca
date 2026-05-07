// frontend/src/hooks/useTimesheet.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { timesheetApi, type TimesheetFilters } from '../api/timesheet';
import { queryKeys } from '../utils/queryKeys';
import type { TimesheetRighePayload } from '../types/timesheet';

export function useTimesheet(filters: TimesheetFilters = {}) {
  return useQuery({
    queryKey: queryKeys.timesheet.list(filters),
    queryFn: () => timesheetApi.list(filters).then((r) => r.data),
  });
}

export function useTimesheetById(id: string) {
  return useQuery({
    queryKey: queryKeys.timesheet.detail(id),
    queryFn: () => timesheetApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useAggiornaRighe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TimesheetRighePayload }) =>
      timesheetApi.aggiornaRighe(id, payload).then((r) => r.data.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.detail(id) });
    },
    onError: () => {
      // Gli errori 409 e 422 specifici sono già gestiti dall'interceptor Axios.
      // Qui gestiamo solo il caso generico non coperto.
      notification.error({ message: 'Errore durante il salvataggio del timesheet' });
    },
  });
}

export function useInviaTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timesheetApi.invia(id).then((r) => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.list({}) });
      queryClient.setQueryData(queryKeys.timesheet.detail(data.id), data);
      notification.success({ message: 'Timesheet inviato per approvazione' });
    },
  });
}

export function useApprovaTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timesheetApi.approva(id).then((r) => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.list({}) });
      queryClient.setQueryData(queryKeys.timesheet.detail(data.id), data);
      notification.success({ message: 'Timesheet approvato' });
    },
  });
}

export function useRifiutaTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      timesheetApi.rifiuta(id, note).then((r) => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.list({}) });
      queryClient.setQueryData(queryKeys.timesheet.detail(data.id), data);
      notification.warning({ message: 'Timesheet rifiutato' });
    },
  });
}
