import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ title, message, confirmLabel, onSettle }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={e => { e.preventDefault(); onSettle(false); }}
    >
      <h2 id="confirm-dialog-title" className="confirm-dialog-title">{title}</h2>
      <p className="confirm-dialog-text">{message}</p>
      <div className="confirm-dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onSettle(false)} autoFocus>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={() => onSettle(true)}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
