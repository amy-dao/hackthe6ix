import { useMemo, useState } from 'react';
import type { Palette } from '../../palette';
import type { CropEntryForm } from '../../types';
import { fieldLabelStyle } from '../../lib/formStyles';
import { titleCase } from '../../lib/fieldHelpers';
import {
  cropMetaSnapshot,
  normalizeCropKey,
  resolveCropOptions,
} from '../../lib/cropMetrics';
import { emptyCropEntry } from '../CropEntryEditor';

interface CropHistoryTimelineProps {
  palette: Palette;
  entries: CropEntryForm[];
  cropOptions?: string[];
  onChange: (entries: CropEntryForm[]) => void;
}

/**
 * Visual crop-history timeline: oldest → newest left-to-right.
 * Add appends a new (most recent) block; drag reorders; newest is highlighted.
 */
export default function CropHistoryTimeline({
  palette,
  entries,
  cropOptions = [],
  onChange,
}: CropHistoryTimelineProps) {
  const allCrops = useMemo(() => resolveCropOptions(cropOptions), [cropOptions]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function addCrop() {
    // New crop = most recent (end of array). Mark it current; clear others.
    const next = [
      ...entries.map((e) => ({ ...e, isCurrent: false })),
      { ...emptyCropEntry(), isCurrent: true },
    ];
    onChange(next);
    setEditingIndex(next.length - 1);
  }

  function removeAt(index: number) {
    const next = entries.filter((_, i) => i !== index);
    if (next.length > 0) {
      // Keep last as current
      onChange(next.map((e, i) => ({ ...e, isCurrent: i === next.length - 1 })));
    } else {
      onChange([]);
    }
    if (editingIndex === index) setEditingIndex(null);
  }

  function setCropAt(index: number, raw: string) {
    const key = raw ? normalizeCropKey(raw) || raw.trim().toLowerCase() : '';
    const meta = key ? cropMetaSnapshot(key) : undefined;
    onChange(
      entries.map((e, i) =>
        i === index
          ? { ...e, crop: key, meta, isCurrent: i === entries.length - 1 }
          : { ...e, isCurrent: i === entries.length - 1 },
      ),
    );
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const next = [...entries];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next.map((e, i) => ({ ...e, isCurrent: i === next.length - 1 })));
  }

  return (
    <div
      style={{
        background: palette.card,
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
      }}
    >
      <div>
        <div style={fieldLabelStyle(palette)}>Crop history</div>
        <div style={{ fontSize: 12, color: palette.muted, lineHeight: 1.4 }}>
          Oldest → newest. Drag blocks to reorder. The rightmost crop is treated as current.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto',
          padding: '8px 4px 12px',
          minHeight: 72,
        }}
      >
        {entries.length === 0 && (
          <div style={{ fontSize: 12.5, color: palette.muted, fontStyle: 'italic', padding: '8px 4px' }}>
            No crops yet — tap Add Crop.
          </div>
        )}

        {entries.map((entry, i) => {
          const isNewest = i === entries.length - 1;
          const isDragging = dragIndex === i;
          const isOver = overIndex === i && dragIndex !== i;
          const selectedKey = normalizeCropKey(entry.crop) || entry.crop;
          const editing = editingIndex === i;

          return (
            <div key={`crop-block-${i}`} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {i > 0 && (
                <div
                  aria-hidden
                  style={{
                    width: 28,
                    height: 2,
                    background: 'rgba(15,45,38,0.2)',
                    position: 'relative',
                    margin: '0 2px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      right: -1,
                      top: -3,
                      width: 0,
                      height: 0,
                      borderTop: '4px solid transparent',
                      borderBottom: '4px solid transparent',
                      borderLeft: '6px solid rgba(15,45,38,0.35)',
                    }}
                  />
                </div>
              )}

              <div
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex != null) reorder(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                style={{
                  minWidth: 108,
                  maxWidth: 140,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: isNewest ? 'rgba(95,122,61,0.14)' : palette.bg,
                  border: isOver
                    ? `2px solid ${palette.accent}`
                    : isNewest
                      ? '2px solid rgba(95,122,61,0.55)'
                      : '1.5px solid rgba(15,45,38,0.1)',
                  boxShadow: isDragging ? '0 6px 18px rgba(0,0,0,0.18)' : 'none',
                  opacity: isDragging ? 0.65 : 1,
                  transform: isDragging ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                  cursor: 'grab',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: isNewest ? '#5F7A3D' : palette.muted,
                    marginBottom: 4,
                  }}
                >
                  {isNewest ? 'Newest' : i === 0 ? 'Oldest' : `Step ${i + 1}`}
                </div>

                {editing ? (
                  <select
                    autoFocus
                    value={selectedKey}
                    onChange={(e) => {
                      setCropAt(i, e.target.value);
                      setEditingIndex(null);
                    }}
                    onBlur={() => setEditingIndex(null)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontWeight: 800,
                      fontSize: 13,
                      color: palette.dark,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select crop…</option>
                    {allCrops.map((c) => (
                      <option key={c} value={c}>
                        {titleCase(c)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingIndex(i)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      fontWeight: 800,
                      fontSize: 13,
                      color: entry.crop ? palette.dark : palette.muted,
                      fontStyle: entry.crop ? 'normal' : 'italic',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    {entry.crop ? titleCase(entry.crop) : 'Pick crop'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Remove crop"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 6,
                    border: 'none',
                    background: 'transparent',
                    color: palette.muted,
                    cursor: 'pointer',
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 2,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, color: palette.muted }}>
          {entries.length === 0
            ? 'Add at least one crop for recommendations.'
            : `${entries.length} crop${entries.length === 1 ? '' : 's'} in timeline`}
        </div>
        <button
          type="button"
          onClick={addCrop}
          style={{
            border: 'none',
            borderRadius: 999,
            padding: '10px 16px',
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 800,
            fontSize: 12.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(15,45,38,0.22)',
          }}
        >
          + Add Crop
        </button>
      </div>
    </div>
  );
}
