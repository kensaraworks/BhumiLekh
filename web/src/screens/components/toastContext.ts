import { createContext, useContext } from 'react';

export type ToastTone = 'info' | 'warn';
export const ToastContext = createContext<(text: string, tone?: ToastTone) => void>(() => {});
export const useToast = () => useContext(ToastContext);
