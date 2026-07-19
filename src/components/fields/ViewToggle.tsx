import type { CSSProperties } from 'react';
import type { Palette } from '../../palette';

export type FieldsViewMode = 'main' | 'fields';

interface ViewToggleProps {
  palette: Palette;
  value: FieldsViewMode;
  onChange: (value: FieldsViewMode) => void;
}

export default function ViewToggle({ palette, value, onChange }: ViewToggleProps) {
  const options: { id: FieldsViewMode; label: string }[] = [
    { id: 'main', label: 'Farm' },
    { id: 'fields', label: 'Fields' },
  ];

  const shell: CSSProperties = {
    display: 'flex',
    gap: 4,
    background: palette.card,
    borderRadius: 12,
    padding: 4,
    flexShrink: 0,
  };

  return (
    <div role="tablist" aria-label="Fields view" style={shell}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 9,
              padding: '10px 0',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: active ? palette.dark : 'transparent',
              color: active ? palette.offwhite : palette.muted,
              transition: 'background 160ms ease, color 160ms ease',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
