import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Renders modals on document.body so layout z-index/stacking does not clip them. */
export default function ModalPortal({ open, children, lockScroll = true }) {
  useEffect(() => {
    if (!open || !lockScroll) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockScroll]);

  if (!open) return null;
  return createPortal(children, document.body);
}
