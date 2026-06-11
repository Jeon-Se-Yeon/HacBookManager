import { useRef, useCallback } from 'react';

/**
 * Close modal only when pointer down + click both start on the backdrop.
 * Prevents closing when the user drags from inside the panel to the outside.
 */
export function useBackdropDismiss(onClose) {
  const pointerDownOnBackdrop = useRef(false);

  const onBackdropMouseDown = useCallback((e) => {
    if (e.target === e.currentTarget) {
      pointerDownOnBackdrop.current = true;
    }
  }, []);

  const onBackdropClick = useCallback(
    (e) => {
      if (e.target !== e.currentTarget) return;
      if (!pointerDownOnBackdrop.current) return;
      onClose();
      pointerDownOnBackdrop.current = false;
    },
    [onClose]
  );

  const onPanelMouseDown = useCallback(() => {
    pointerDownOnBackdrop.current = false;
  }, []);

  const onPanelClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return {
    backdropHandlers: {
      onMouseDown: onBackdropMouseDown,
      onClick: onBackdropClick,
    },
    panelHandlers: {
      onMouseDown: onPanelMouseDown,
      onClick: onPanelClick,
    },
  };
}
