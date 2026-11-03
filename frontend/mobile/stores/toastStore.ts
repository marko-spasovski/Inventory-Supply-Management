import { create } from 'zustand';

export type ToastVariant = 'success' | 'error';

interface ToastState {
  visible: boolean;
  message: string;
  variant: ToastVariant;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  variant: 'success',
  show: (message, variant = 'success') => set({ visible: true, message, variant }),
  hide: () => set({ visible: false }),
}));

// Imperative helper for non-React call sites.
export function showToast(message: string, variant: ToastVariant = 'success'): void {
  useToastStore.getState().show(message, variant);
}
