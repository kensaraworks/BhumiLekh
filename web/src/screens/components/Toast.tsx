import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastTone as Tone } from './toastContext';
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}

/** Small status messages for mocked or unavailable actions. Never used to claim a backend success that did not happen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const push = useCallback((text: string, tone: Tone = 'info') => {
    const id = next.current++;
    setItems((prev) => [...prev.filter((t) => t.text !== text).slice(-2), { id, text, tone }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-5 bottom-5 z-50 flex flex-col items-end gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-lg px-3.5 py-2.5 text-[13px] shadow-[0_6px_20px_rgba(27,36,32,0.14)] ${
              t.tone === 'warn' ? 'border border-[#E9C79C] bg-warn-soft text-warn' : 'bg-ink text-white'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
