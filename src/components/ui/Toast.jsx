import { useEffect, useRef, useState } from 'react';

// Singleton toast — se llama con showToast(msg, type)
let _setToast = null;

export function showToast(msg, type = 'success') {
  _setToast?.({ msg, type, id: Date.now() });
}

const BG = {
  success: '#10b981',
  error:   '#ef4444',
  warn:    '#f59e0b',
};

export function Toast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    _setToast = setToast;
    return () => { _setToast = null; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        padding: '12px 20px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        background: BG[toast.type] ?? BG.success,
        color: 'white',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
      }}
    >
      {toast.msg}
    </div>
  );
}
