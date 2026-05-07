// frontend/src/store/useWizardStore.ts
// Gestisce lo stato del wizard "Nuovo progetto" (5 step).
// I dati vengono accumulati step per step e inviati al backend solo al completamento.

import { create } from 'zustand';
import type { Progetto } from '../types/progetto';

interface WizardState {
  stepCorrente: number;
  datiProgetto: Partial<Progetto>;
  setStep: (step: number) => void;
  avanzaStep: () => void;
  tornaStep: () => void;
  aggiornaDati: (dati: Partial<Progetto>) => void;
  reset: () => void;
}

const STEP_INIZIALE = 0;

export const useWizardStore = create<WizardState>((set) => ({
  stepCorrente: STEP_INIZIALE,
  datiProgetto: {},

  setStep: (step) => set({ stepCorrente: step }),
  avanzaStep: () => set((state) => ({ stepCorrente: state.stepCorrente + 1 })),
  tornaStep: () => set((state) => ({ stepCorrente: Math.max(0, state.stepCorrente - 1) })),
  aggiornaDati: (dati) => set((state) => ({ datiProgetto: { ...state.datiProgetto, ...dati } })),
  reset: () => set({ stepCorrente: STEP_INIZIALE, datiProgetto: {} }),
}));
