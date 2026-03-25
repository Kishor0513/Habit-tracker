import React from "react";
import { useToast } from "../state/ToastState.jsx";

export default function ToastViewport() {
  const { toasts } = useToast();
  return (
    <div className="toastViewport" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className="toast" role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}
