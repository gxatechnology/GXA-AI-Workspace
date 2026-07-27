import React, { ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

export interface ExportMenuOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface ExportMenuProps {
  children: ReactNode;
  options: ExportMenuOption[];
  onSelect: (optionId: string) => void | Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
}

export default function ExportMenu({
  children,
  options,
  onSelect,
  triggerLabel = 'Export',
  triggerClassName = '',
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busyOption, setBusyOption] = useState<string | null>(null);
  const [error, setError] = useState('');
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndexes = useMemo(() => options
    .map((option, index) => option.disabled ? -1 : index)
    .filter(index => index >= 0), [options]);

  const focusOption = useCallback((index: number) => {
    const nextIndex = options[index]?.disabled ? enabledIndexes[0] : index;
    if (nextIndex === undefined) return;
    setActiveIndex(nextIndex);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }, [enabledIndexes, options]);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    setError('');
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const openMenu = useCallback((preferredIndex?: number) => {
    const fallback = enabledIndexes[0] ?? 0;
    const nextIndex = preferredIndex !== undefined && !options[preferredIndex]?.disabled ? preferredIndex : fallback;
    setError('');
    setOpen(true);
    setActiveIndex(nextIndex);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }, [enabledIndexes, options]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [close, open]);

  const moveFocus = (direction: 1 | -1) => {
    if (!enabledIndexes.length) return;
    const currentPosition = enabledIndexes.indexOf(activeIndex);
    const nextPosition = currentPosition < 0
      ? 0
      : (currentPosition + direction + enabledIndexes.length) % enabledIndexes.length;
    focusOption(enabledIndexes[nextPosition]);
  };

  const select = async (option: ExportMenuOption) => {
    if (option.disabled || busyOption) return;
    setBusyOption(option.id);
    setError('');
    try {
      await onSelect(option.id);
      close(true);
    } catch {
      setError(`${option.label} could not be exported. Your document is unchanged.`);
    } finally {
      setBusyOption(null);
    }
  };

  return <div ref={rootRef} className="relative inline-flex" data-testid="export-menu-root">
    <button
      ref={triggerRef}
      type="button"
      aria-label={triggerLabel}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={() => open ? close(false) : openMenu()}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openMenu();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          openMenu(enabledIndexes[enabledIndexes.length - 1]);
        }
      }}
      className={triggerClassName}
    >
      {children}
    </button>
    {open && <div className="absolute right-0 top-[calc(100%-1px)] z-[70] w-48 max-w-[calc(100vw-2rem)] pt-2" data-testid="export-menu-boundary">
      <div id={menuId} role="menu" aria-label="Export formats" className="theme-popover overflow-hidden rounded-xl p-1 shadow-xl" data-testid="export-menu">
        {options.map((option, index) => <button
          key={option.id}
          ref={element => { optionRefs.current[index] = element; }}
          type="button"
          role="menuitem"
          tabIndex={activeIndex === index ? 0 : -1}
          disabled={option.disabled || Boolean(busyOption)}
          aria-busy={busyOption === option.id || undefined}
          onFocus={() => setActiveIndex(index)}
          onClick={() => select(option)}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(1); }
            else if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(-1); }
            else if (event.key === 'Home') { event.preventDefault(); focusOption(enabledIndexes[0]); }
            else if (event.key === 'End') { event.preventDefault(); focusOption(enabledIndexes[enabledIndexes.length - 1]); }
            else if (event.key === 'Tab') close(false);
          }}
          className="theme-menu-item w-full rounded-lg px-3 py-2 text-left text-xs font-semibold"
        >
          {busyOption === option.id ? `Exporting ${option.label}...` : option.label}
        </button>)}
        {error && <p role="alert" className="px-3 py-2 text-xs text-[var(--color-danger)]">{error}</p>}
      </div>
    </div>}
  </div>;
}
