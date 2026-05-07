// frontend/src/hooks/useStruttura.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { apiClient } from '../api/client';
import type { ApiResponse } from '../types/api';
import type { WorkPackage, Task, Deliverable, Milestone } from '../types/struttura';

// ─── Work Package ────────────────────────────────────────────────────────────

export function useWorkPackages(progettoId: string) {
  return useQuery({
    queryKey: ['progetti', progettoId, 'wp'],
    queryFn: () =>
      apiClient.get<ApiResponse<WorkPackage[]>>(`/progetti/${progettoId}/wp`).then((r) => r.data.data),
    enabled: !!progettoId,
  });
}

export function useUpsertWorkPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkPackage> & { progetto_id: string }) => {
      if (data.id) {
        return apiClient.patch<ApiResponse<WorkPackage>>(`/wp/${data.id}`, data).then((r) => r.data.data);
      }
      return apiClient.post<ApiResponse<WorkPackage>>(`/progetti/${data.progetto_id}/wp`, data).then((r) => r.data.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['progetti', data.progetto_id, 'wp'] });
      notification.success({ message: 'Work Package salvato' });
    },
  });
}

// ─── Milestone ───────────────────────────────────────────────────────────────

export function useMilestone(progettoId: string) {
  return useQuery({
    queryKey: ['progetti', progettoId, 'milestone'],
    queryFn: () =>
      apiClient.get<ApiResponse<Milestone[]>>(`/progetti/${progettoId}/milestone`).then((r) => r.data.data),
    enabled: !!progettoId,
  });
}

// ─── Deliverable ─────────────────────────────────────────────────────────────

export function useDeliverable(progettoId: string) {
  return useQuery({
    queryKey: ['progetti', progettoId, 'deliverable'],
    queryFn: () =>
      apiClient.get<ApiResponse<Deliverable[]>>(`/progetti/${progettoId}/deliverable`).then((r) => r.data.data),
    enabled: !!progettoId,
  });
}

// ─── Task (dentro un WP) ─────────────────────────────────────────────────────

export function useTask(wpId: string) {
  return useQuery({
    queryKey: ['wp', wpId, 'task'],
    queryFn: () =>
      apiClient.get<ApiResponse<Task[]>>(`/wp/${wpId}/task`).then((r) => r.data.data),
    enabled: !!wpId,
  });
}
