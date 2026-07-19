import type { Palette } from '../palette';
import type { CropEntryForm } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';
import { titleCase } from '../lib/fieldHelpers';

interface CropEntryEditorProps {
  palette: Palette;
  title?: string;
  helperText?: string;
  cropOptions: string[];
  entries: CropEntryForm[];
  onAddCropEntry: () => void;
  onRemoveCropEntry: (index: number) => void;
  onChangeCropEntryCrop: (index: number, crop: string) => void;
  onChangeCropEntryMonth: (index: number, month: string) => void;
  onSetCurrentEntry: (index: number) => void;
}

function selectStyle(palette: Palette) {
  return { ...fieldInputStyle(palette), appearance: 'auto' as const, cursor: 'pointer' };
}

export default function CropEntryEditor({
  palette,
  title = 'Crops on this field',
  helperText = "Add what's currently growing here (if anything) and any earlier crops you know about. A rotation recommendation needs both a current crop and at least one earlier one.",
  cropOptions,
  entries,
  onAddCropEntry,
  onRemoveCropEntry,
  onChangeCropEntryCrop,
  onChangeCropEntryMonth,
  onSetCurrentEntry,
}: CropEntryEditorProps) {
  const cropChoices = cropOptions.map(titleCase);
  const currentCount = entries.filter((e) => e.isCurrent).length;

  return (
    <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={fieldLabelStyle(palette)}>{title}</div>
        {helperText && <div style={{ fontSize: 12, color: palette.muted, lineHeight: 1.4 }}>{helperText}</div>}
      </div>

      {entries.length === 0 ? (
        <div style={{ fontSize: 12.5, color: palette.muted, fontStyle: 'italic' }}>No crops added yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map((entry: CropEntryForm, i: number) => (
            <div key={i} style={{ background: palette.bg, borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={entry.crop}
                  onChange={(e) => onChangeCropEntryCrop(i, e.target.value)}
                  style={{ ...selectStyle(palette), flex: 1, background: palette.card }}
                >
                  <option value="">Select a crop…</option>
                  {cropChoices.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="month"
                  value={entry.month}
                  onChange={(e) => onChangeCropEntryMonth(i, e.target.value)}
                  style={{ ...fieldInputStyle(palette), background: palette.card, width: 150, flexShrink: 0 }}
                />
                <div
                  onClick={() => onRemoveCropEntry(i)}
                  style={{ fontSize: 18, color: palette.muted, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                  aria-label="Remove"
                >
                  ×
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: palette.dark, cursor: 'pointer' }}>
                <input type="checkbox" checked={entry.isCurrent} onChange={() => onSetCurrentEntry(i)} />
                Still growing here now
              </label>
            </div>
          ))}
        </div>
      )}

      {currentCount > 1 && (
        <div style={{ fontSize: 11.5, color: palette.rotate.bg }}>Only one crop can be marked as currently growing.</div>
      )}

      <div onClick={onAddCropEntry} style={{ fontSize: 12.5, fontWeight: 600, color: palette.accent, cursor: 'pointer' }}>
        + Add a crop
      </div>
    </div>
  );
}
