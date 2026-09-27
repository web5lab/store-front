import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

const ConfirmContext = createContext(null);

/**
 * `const confirm = useConfirm(); if (await confirm({ title, body, action })) …`
 * One dialog for the whole app, so every destructive step reads the same way.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState(options);
      }),
    []
  );

  const close = (answer) => {
    resolver.current?.(answer);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        onClose={() => close(false)}
        title={state?.title}
        width="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)}>
              {state?.cancel || 'Keep it'}
            </Button>
            <Button variant={state?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
              {state?.action || 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-quiet">{state?.body}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export const useConfirm = () => useContext(ConfirmContext);
