import { useMemo, useState } from 'react';
import type { Palette } from '../palette';
import type { CropEntryForm } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';
import { titleCase } from '../lib/fieldHelpers';
import {
  cropMetaSnapshot,
  normalizeCropKey,
  resolveCropOptions,
} from '../lib/cropMetrics';

interface CropEntryEditorProps {
  palette: Palette;
  title?: string;
  helperText?: string;
  /** Optional extras merged with CROP_REFERENCE keys (e.g. API reference). */
  cropOptions?: string[];
  entries: CropEntryForm[];
  onAddCropEntry: () => void;
  onRemoveCropEntry: (index: number) => void;
  onChangeCropEntryCrop: (index: number, crop: string, meta?: CropEntryForm['meta']) => void;
  onChangeCropEntryDates: (index: number, dates: { startDate: string; endDate: string; month: string }) => void;
  onSetCurrentEntry: (index: number) => void;
}

function selectStyle(palette: Palette) {
  return { ...fieldInputStyle(palette), appearance: 'auto' as const, cursor: 'pointer' };
}

/** Resolve display start date; migrate legacy month-only entries. */
export function resolveStartDate(entry: CropEntryForm): string {
  if (entry.startDate) return entry.startDate;
  if (entry.month && /^\d{4}-\d{2}$/.test(entry.month)) return `${entry.month}-01`;
  return '';
}

export function resolveEndDate(entry: CropEntryForm): string {
  return entry.endDate || '';
}

export function emptyCropEntry(): CropEntryForm {
  return { crop: '', month: '', startDate: '', endDate: '', isCurrent: false };
}

function monthFromDate(date: string): string {
  return date && date.length >= 7 ? date.slice(0, 7) : '';
}

export default function CropEntryEditor({
  palette,
  title = 'Crops on this field',
  helperText = "Add what's currently growing here (if anything) and any earlier crops you know about. A rotation recommendation needs both a current crop and at least one earlier one.",
  cropOptions = [],
  entries,
  onAddCropEntry,
  onRemoveCropEntry,
  onChangeCropEntryCrop,
  onChangeCropEntryDates,
  onSetCurrentEntry,
}: CropEntryEditorProps) {
  const [filter, setFilter] = useState('');
  const allCrops = useMemo(() => resolveCropOptions(cropOptions), [cropOptions]);
  const filteredCrops = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allCrops;
    return allCrops.filter((c) => c.includes(q) || titleCase(c).toLowerCase().includes(q));
  }, [allCrops, filter]);

  const currentCount = entries.filter((e) => e.isCurrent).length;

  function handleCropChange(index: number, raw: string) {
    if (!raw) {
      onChangeCropEntryCrop(index, '', undefined);
      return;
    }
    const key = normalizeCropKey(raw) || raw.trim().toLowerCase();
    const meta = cropMetaSnapshot(key);
    onChangeCropEntryCrop(index, key, meta);
  }

  function handleStartChange(index: number, entry: CropEntryForm, startDate: string) {
    onChangeCropEntryDates(index, {
      startDate,
      endDate: resolveEndDate(entry),
      month: monthFromDate(startDate),
    });
  }

  function handleEndChange(index: number, entry: CropEntryForm, endDate: string) {
    const startDate = resolveStartDate(entry);
    onChangeCropEntryDates(index, {
      startDate,
      endDate,
      month: monthFromDate(startDate),
    });
  }

  return (
    <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={fieldLabelStyle(palette)}>{title}</div>
        {helperText && <div style={{ fontSize: 12, color: palette.muted, lineHeight: 1.4 }}>{helperText}</div>}
      </div>

      {allCrops.length > 6 && (
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search crops…"
          style={{ ...fieldInputStyle(palette), background: palette.bg }}
          aria-label="Search crops"
        />
      )}

      {entries.length === 0 ? (
        <div style={{ fontSize: 12.5, color: palette.muted, fontStyle: 'italic' }}>No crops added yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map((entry: CropEntryForm, i: number) => {
            const selectedKey = normalizeCropKey(entry.crop) || entry.crop;
            const optionsForRow =
              selectedKey && !filteredCrops.includes(selectedKey)
                ? [selectedKey, ...filteredCrops]
                : filteredCrops;
            const startDate = resolveStartDate(entry);
            const endDate = resolveEndDate(entry);

            return (
              <div key={i} style={{ background: palette.bg, borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={selectedKey}
                    onChange={(e) => handleCropChange(i, e.target.value)}
                    style={{ ...selectStyle(palette), flex: 1, minWidth: 0, background: palette.card }}
                  >
                    <option value="">Select a crop…</option>
                    {optionsForRow.map((c) => (
                      <option key={c} value={c}>
                        {titleCase(c)}
                      </option>
                    ))}
                  </select>
                  <div
                    onClick={() => onRemoveCropEntry(i)}
                    style={{ fontSize: 18, color: palette.muted, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                    aria-label="Remove"
                  >
                    ×
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ ...fieldLabelStyle(palette), marginBottom: 4 }}>Start date</div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartChange(i, entry, e.target.value)}
                      style={{ ...fieldInputStyle(palette), background: palette.card }}
                    />
                  </div>
                  <div>
                    <div style={{ ...fieldLabelStyle(palette), marginBottom: 4 }}>End date</div>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      disabled={entry.isCurrent}
                      onChange={(e) => handleEndChange(i, entry, e.target.value)}
                      style={{
                        ...fieldInputStyle(palette),
                        background: palette.card,
                        opacity: entry.isCurrent ? 0.5 : 1,
                      }}
                    />
                  </div>
                </div>

                {entry.meta && (
                  <div style={{ fontSize: 11, color: palette.muted, lineHeight: 1.35 }}>
                    {titleCase(entry.meta.family)} · N {entry.meta.nitrogen_demand} · P {entry.meta.phosphorus_demand} · K{' '}
                    {entry.meta.potassium_demand}
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: palette.dark, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={entry.isCurrent}
                    onChange={() => {
                      onSetCurrentEntry(i);
                      if (!entry.isCurrent) {
                        // Marking as current clears end date
                        onChangeCropEntryDates(i, {
                          startDate,
                          endDate: '',
                          month: monthFromDate(startDate),
                        });
                      }
                    }}
                  />
                  Still growing here now
                </label>
              </div>
            );
          })}
        </div>
      )}

      {currentCount > 1 && (
        <div style={{ fontSize: 11.5, color: palette.rotate.bg }}>Only one crop can be marked as currently growing.</div>
      )}

      {filter.trim() && filteredCrops.length === 0 && (
        <div style={{ fontSize: 12, color: palette.muted }}>No crops match “{filter.trim()}”.</div>
      )}

      <div onClick={onAddCropEntry} style={{ fontSize: 12.5, fontWeight: 600, color: palette.accent, cursor: 'pointer' }}>
        + Add a crop
      </div>
    </div>
  );
}
