import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { tooltipContentClasses } from '../constants/tooltipStyles';

export function FullNameTooltip({ text, children }: { text: string; children: ReactNode }) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current || !tooltipRef.current) return;
    if (!hasOverflow()) {
      setIsOpen(false);
      return;
    }
    const anchor = anchorRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.left, window.innerWidth - tooltip.width - 12));
    const below = anchor.bottom + 8;
    const top = below + tooltip.height <= window.innerHeight - 12
      ? below
      : Math.max(12, anchor.top - tooltip.height - 8);
    setPosition({ left, top });
  }, [isOpen, text]);

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  function show() {
    if (isOpen) return;
    setPosition(null);
    setIsOpen(Boolean(text) && hasOverflow());
  }

  function hasOverflow() {
    const label = anchorRef.current?.firstElementChild;
    if (!(label instanceof HTMLElement)) return false;
    if (!(label instanceof HTMLInputElement)) return label.scrollWidth > label.clientWidth;

    // Inputs do not consistently expose the width of their text through scrollWidth.
    const styles = window.getComputedStyle(label);
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return false;
    context.font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
    const letterSpacing = Number.parseFloat(styles.letterSpacing) || 0;
    const textWidth = context.measureText(label.value).width + Math.max(0, label.value.length - 1) * letterSpacing;
    const availableWidth = label.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight);
    return textWidth > availableWidth;
  }

  return (
    <span
      ref={anchorRef}
      className="block min-w-0 flex-1"
      aria-describedby={isOpen ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={show}
      onBlur={() => setIsOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setIsOpen(false);
      }}
    >
      {children}
      {isOpen && createPortal(
        <span
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className={tooltipContentClasses('pointer-events-none fixed z-50 w-max px-3 py-2 text-sm! wrap-break-word')}
          style={{
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            maxWidth: Math.min(384, window.innerWidth - 24),
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  );
}
