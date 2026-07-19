import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Palette } from '../../palette';

interface MenuItem {
  label: string;
  onClick?: () => void;
}

interface EllipsisMenuProps {
  palette: Palette;
  items: MenuItem[];
  /** Align menu to the right edge of the trigger (default true). */
  alignRight?: boolean;
}

export default function EllipsisMenu({ palette, items, alignRight = true }: EllipsisMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const btn: CSSProperties = {
    width: 32,
    height: 32,
    border: 'none',
    borderRadius: 8,
    background: open ? 'rgba(15,45,38,0.08)' : 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: 0,
  };

  const menu: CSSProperties = {
    position: 'absolute',
    top: '100%',
    ...(alignRight ? { right: 0 } : { left: 0 }),
    marginTop: 4,
    minWidth: 128,
    background: palette.card,
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(15,45,38,0.16)',
    border: '1px solid rgba(15,45,38,0.08)',
    padding: 4,
    zIndex: 20,
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={btn}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: palette.muted,
              display: 'block',
            }}
          />
        ))}
      </button>
      {open && (
        <div role="menu" style={menu}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick?.();
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                borderRadius: 7,
                padding: '10px 12px',
                fontSize: 13.5,
                fontWeight: 600,
                color: palette.dark,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = palette.bg;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Optional wrapper for menu portal-style usage (not required). */
export function MenuPanel({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
