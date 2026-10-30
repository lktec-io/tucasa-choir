import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

// Returns [confirm, dialog]: await confirm({...}) resolves true or false; render dialog once.
export function useConfirm() {
  const [request, setRequest] = useState(null);

  const confirm = useCallback(
    ({ title, message, confirmLabel = 'Delete' }) =>
      new Promise(resolve => setRequest({ title, message, confirmLabel, resolve })),
    []
  );

  const settle = (result) => {
    request.resolve(result);
    setRequest(null);
  };

  const dialog = request ? (
    <ConfirmDialog
      title={request.title}
      message={request.message}
      confirmLabel={request.confirmLabel}
      onSettle={settle}
    />
  ) : null;

  return [confirm, dialog];
}
