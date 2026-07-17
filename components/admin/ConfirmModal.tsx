"use client";
import { useState, useCallback, useRef, useEffect } from "react";

interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (val: boolean) => void;
}

// Singleton state — exported so the hook can trigger it
let _setConfirm: ((s: ConfirmState | null) => void) | null = null;

export function useConfirm() {
  return useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    const opts: ConfirmOptions = typeof options === "string" ? { message: options } : options;
    return new Promise(resolve => {
      if (!_setConfirm) { resolve(window.confirm(opts.message)); return; }
      _setConfirm({ ...opts, resolve });
    });
  }, []);
}

export default function ConfirmModal() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { _setConfirm = setState; return () => { _setConfirm = null; }; }, []);
  useEffect(() => { if (state) confirmRef.current?.focus(); }, [state]);

  if (!state) return null;

  const respond = (val: boolean) => { state.resolve(val); setState(null); };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90">
      <div
        className="bg-[#0d0d0d] border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-white font-mono text-sm leading-relaxed mb-6">{state.message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => respond(false)}
            className="text-xs px-4 py-2 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 font-mono transition-colors"
          >
            {state.cancelLabel ?? "Annuler"}
          </button>
          <button
            ref={confirmRef}
            onClick={() => respond(true)}
            className={`text-xs px-4 py-2 rounded font-mono font-bold transition-colors ${
              state.danger
                ? "bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30"
                : "bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green/20"
            }`}
          >
            {state.confirmLabel ?? "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
