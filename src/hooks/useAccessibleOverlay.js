import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const isVisible = (element) => element instanceof HTMLElement && element.getClientRects().length > 0;

const getFocusableElements = (container) => {
  if (!(container instanceof HTMLElement)) return [];

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    return isVisible(element);
  });
};

export function useAccessibleOverlay({ isOpen, onClose, lockBodyScroll = true }) {
  const overlayRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    const overlayNode = overlayRef.current;

    const focusInitialTarget = () => {
      if (!(overlayNode instanceof HTMLElement)) return;

      const focusableElements = getFocusableElements(overlayNode);
      const preferredTarget = focusableElements.find((element) => element.hasAttribute('data-autofocus'));
      const focusTarget = preferredTarget || focusableElements[0] || overlayNode;
      focusTarget.focus();
    };

    const focusTimer = window.setTimeout(focusInitialTarget, 0);

    const handleKeyDown = (event) => {
      if (!isOpen || !(overlayNode instanceof HTMLElement)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(overlayNode);
      if (focusableElements.length === 0) {
        event.preventDefault();
        overlayNode.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);

      if (lockBodyScroll) {
        document.body.style.overflow = previousOverflow;
      }

      if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [isOpen, lockBodyScroll, onClose]);

  return overlayRef;
}
