import { useMemo, useState } from 'react';
import type { Palette } from '../palette';
import type { Field } from '../types';
import { statusMeta, cropIcon, titleCase } from '../lib/fieldHelpers';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';
import { resolveCropOptions, resolveSoilTypeOptions } from '../lib/cropMetrics';

const PH_MIN = 3.5;
const PH_MAX = 9;

interface FieldDraft {
  name: string;
  acres: string;
  soilPh: string;
  soilPhUnknown: boolean;
  soilType: string;
}

function draftFromField(field: Field): FieldDraft {
  return {
    name: field.name,
    acres: String(field.acres),
    soilPh: field.soilPh != null ? String(field.soilPh) : '',
    soilPhUnknown: field.soilPh == null,
    soilType: field.soilType ?? '',
  };
}

interface FieldDetailScreenProps {
  palette: Palette;
  field: Field;
  cropOptions: string[];
  soilTypeOptions: string[];
  editingCrop: boolean;
  actionMessage: string | false;
  onStartEditCrop: () => void;
  onCancelEditCrop: () => void;
  onSelectCrop: (crop: string) => void;
  onClearCrop: () => void;
  onAccept: () => void;
  onOverride: () => void;
  onDismiss: () => void;
  onSaveField: (updates: { name: string; acres: number; soilPh?: number; soilType: string }) => void;
  onDeleteField: () => void;
}

type DetailTab = 'field' | 'crop' | 'history';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'field', label: 'Field' },
  { id: 'crop', label: 'Crop' },
  { id: 'history', label: 'History' },
];

function selectStyle(palette: Palette) {
  return { ...fieldInputStyle(palette), appearance: 'auto' as const, cursor: 'pointer' };
}

export default function FieldDetailScreen({
  palette,
  field,
  cropOptions = [],
  soilTypeOptions = [],
  editingCrop,
  actionMessage,
  onStartEditCrop,
  onCancelEditCrop,
  onSelectCrop,
  onClearCrop,
  onAccept,
  onOverride,
  onDismiss,
  onSaveField,
  onDeleteField,
}: FieldDetailScreenProps) {
  const [tab, setTab] = useState<DetailTab>('crop');
  const [confirmingClearCrop, setConfirmingClearCrop] = useState(false);
  const [confirmingDeleteField, setConfirmingDeleteField] = useState(false);
  const [draft, setDraft] = useState<FieldDraft>(() => draftFromField(field));
  const soils = useMemo(() => resolveSoilTypeOptions(soilTypeOptions), [soilTypeOptions]);
  const crops = useMemo(() => resolveCropOptions(cropOptions), [cropOptions]);

  const meta = statusMeta(field.status, palette);
  const hasRecommendation = field.status === 'safe' || field.status === 'marginal' || field.status === 'rotate';
  const hasSuggestedCrops = field.suggestedCrops.length > 0;
  const hasCrop = field.status !== 'empty';

  const original = draftFromField(field);
  const dirty =
    draft.name !== original.name ||
    draft.acres !== original.acres ||
    draft.soilPh !== original.soilPh ||
    draft.soilPhUnknown !== original.soilPhUnknown ||
    draft.soilType !== original.soilType;

  const acresValue = Number(draft.acres);
  const acresValid = draft.acres.trim() !== '' && Number.isFinite(acresValue) && acresValue > 0;
  const phValue = Number(draft.soilPh);
  const phValid = draft.soilPhUnknown || (draft.soilPh.trim() !== '' && Number.isFinite(phValue) && phValue >= PH_MIN && phValue <= PH_MAX);
  const canSaveField = draft.name.trim().length > 0 && draft.soilType.trim().length > 0 && acresValid && phValid;

  function saveField() {
    if (!dirty || !canSaveField) return;
    onSaveField({
      name: draft.name.trim(),
      acres: acresValue,
      soilPh: draft.soilPhUnknown ? undefined : phValue,
      soilType: draft.soilType,
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: palette.dark }}>{field.crop}</div>
          <div style={{ fontSize: 13, color: palette.muted, marginTop: 2 }}>{field.acres} acres</div>
        </div>
        {tab === 'crop' && !editingCrop && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingTop: 4 }}>
            <div onClick={onStartEditCrop} style={{ fontSize: 12.5, fontWeight: 700, color: palette.accent, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Change crop
            </div>
            {hasCrop && (
              <div
                onClick={() => setConfirmingClearCrop(true)}
                style={{ fontSize: 12.5, fontWeight: 700, color: palette.rotate.bg, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Clear crop
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, background: palette.card, borderRadius: 12, padding: 4 }}>
        {TABS.map((t) => (
          <div
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '9px 0',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: tab === t.id ? palette.dark : 'transparent',
              color: tab === t.id ? palette.offwhite : palette.muted,
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'field' && (
        <>
          <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={fieldLabelStyle(palette)}>Field name</div>
              <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} style={fieldInputStyle(palette)} />
            </div>
            <div>
              <div style={fieldLabelStyle(palette)}>Acres</div>
              <input
                type="number"
                min={0}
                step="0.1"
                value={draft.acres}
                onChange={(e) => setDraft((d) => ({ ...d, acres: e.target.value }))}
                style={fieldInputStyle(palette)}
              />
              {!acresValid && <div style={{ fontSize: 11.5, color: palette.rotate.bg, marginTop: 4 }}>Enter a size greater than 0.</div>}
            </div>
            <div>
              <div style={fieldLabelStyle(palette)}>Soil pH</div>
              <input
                type="number"
                min={PH_MIN}
                max={PH_MAX}
                step="0.1"
                value={draft.soilPh}
                disabled={draft.soilPhUnknown}
                onChange={(e) => setDraft((d) => ({ ...d, soilPh: e.target.value }))}
                style={{ ...fieldInputStyle(palette), opacity: draft.soilPhUnknown ? 0.5 : 1 }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12.5, color: palette.muted, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.soilPhUnknown}
                  onChange={() => setDraft((d) => ({ ...d, soilPhUnknown: !d.soilPhUnknown, soilPh: d.soilPhUnknown ? d.soilPh : '' }))}
                />
                I don't know my soil pH yet
              </label>
              {!phValid && (
                <div style={{ fontSize: 11.5, color: palette.rotate.bg, marginTop: 4 }}>
                  Enter a pH between {PH_MIN} and {PH_MAX}, or check "don't know yet".
                </div>
              )}
            </div>
            <div>
              <div style={fieldLabelStyle(palette)}>Soil type</div>
              <select
                value={draft.soilType === 'slit' ? 'silt' : draft.soilType}
                onChange={(e) => setDraft((d) => ({ ...d, soilType: e.target.value }))}
                style={selectStyle(palette)}
              >
                <option value="">Select soil type…</option>
                {soils.map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div
                onClick={saveField}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '12px 0',
                  borderRadius: 10,
                  background: palette.dark,
                  color: palette.offwhite,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: dirty && canSaveField ? 'pointer' : 'default',
                  opacity: dirty && canSaveField ? 1 : 0.45,
                }}
              >
                Save changes
              </div>
              <div
                onClick={() => (dirty ? setDraft(draftFromField(field)) : undefined)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '12px 0',
                  borderRadius: 10,
                  color: palette.muted,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: dirty ? 'pointer' : 'default',
                  opacity: dirty ? 1 : 0.45,
                }}
              >
                Cancel
              </div>
            </div>
          </div>

          <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={fieldLabelStyle(palette)}>Danger zone</div>
            {!confirmingDeleteField ? (
              <div
                onClick={() => setConfirmingDeleteField(true)}
                style={{
                  textAlign: 'center',
                  padding: '12px 0',
                  borderRadius: 10,
                  background: 'transparent',
                  border: `1.5px solid ${palette.rotate.bg}`,
                  color: palette.rotate.bg,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                Delete this field
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: palette.muted, lineHeight: 1.5 }}>
                  This permanently deletes "{field.name}" and its planting history. This can't be undone.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div
                    onClick={onDeleteField}
                    style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: 10, background: palette.rotate.bg, color: palette.rotate.text, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
                  >
                    Confirm delete
                  </div>
                  <div
                    onClick={() => setConfirmingDeleteField(false)}
                    style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: 10, color: palette.muted, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
                  >
                    Cancel
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'crop' && (
        <>
          <div style={{ borderRadius: 18, background: meta.bg, padding: 18, color: meta.text }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>
              Rotation status
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{meta.label}</div>
            {hasRecommendation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 6, background: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${field.risk}%`, background: 'currentColor', opacity: 0.9 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>Risk {field.risk}</div>
              </div>
            )}
          </div>

          <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Why
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.5, color: palette.dark }}>{field.reason}</div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: palette.muted }}>
              Confidence: <span style={{ fontWeight: 700, color: palette.dark }}>{field.confidence}</span>
              {field.lastScan ? <> · planted {field.lastScan}</> : null}
            </div>
          </div>

          {editingCrop && (
            <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                What's planted now?
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {crops.map((key) => {
                  const label = titleCase(key);
                  const active = field.crop.toLowerCase() === key;
                  return (
                    <div
                      key={key}
                      onClick={() => onSelectCrop(label)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: active ? palette.dark : palette.bg,
                        color: active ? palette.offwhite : palette.dark,
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
              <div onClick={onCancelEditCrop} style={{ textAlign: 'center', fontSize: 12.5, color: palette.muted, cursor: 'pointer' }}>
                Cancel
              </div>
            </div>
          )}

          {confirmingClearCrop && (
            <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: palette.dark, lineHeight: 1.5 }}>
                Clear the crop and leave this field empty? The current planting will be logged to History.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div
                  onClick={() => {
                    onClearCrop();
                    setConfirmingClearCrop(false);
                  }}
                  style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 10, background: palette.rotate.bg, color: palette.rotate.text, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
                >
                  Yes, clear crop
                </div>
                <div
                  onClick={() => setConfirmingClearCrop(false)}
                  style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 10, color: palette.muted, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
                >
                  Cancel
                </div>
              </div>
            </div>
          )}

          {hasSuggestedCrops && (
            <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Suggested next crops
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {field.suggestedCrops.map((c) => (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: palette.bg, borderRadius: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: palette.accent, flexShrink: 0 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: palette.dark }}>{c}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {field.durationLabel}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: palette.dark }}>{field.durationRange}</div>
          </div>

          {actionMessage && (
            <div style={{ background: palette.dark, color: palette.offwhite, borderRadius: 12, padding: '12px 14px', fontSize: 13.5, fontWeight: 600, textAlign: 'center' }}>
              {actionMessage}
            </div>
          )}

          {hasRecommendation && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div onClick={onAccept} style={{ flex: 1, textAlign: 'center', padding: '13px 0', borderRadius: 12, background: palette.dark, color: palette.offwhite, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Accept
              </div>
              <div
                onClick={onOverride}
                style={{ flex: 1, textAlign: 'center', padding: '13px 0', borderRadius: 12, background: 'transparent', border: `1.5px solid ${palette.dark}`, color: palette.dark, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Override
              </div>
              <div onClick={onDismiss} style={{ flex: 1, textAlign: 'center', padding: '13px 0', borderRadius: 12, background: 'transparent', color: palette.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Dismiss
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {field.status !== 'empty' && (
            <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Currently planted
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: palette.bg, borderRadius: 10 }}>
                <span style={{ fontSize: 18 }}>{cropIcon(field.crop)}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: palette.dark }}>{field.crop}</div>
                  <div style={{ fontSize: 11.5, color: palette.muted }}>Since {field.lastScan || 'unknown'}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Past plantings
            </div>
            {field.history.length === 0 ? (
              <div style={{ fontSize: 13.5, color: palette.muted, lineHeight: 1.5 }}>
                No planting history recorded yet for this field.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {field.history.map((record, i) => (
                  <div key={`${record.crop}-${record.period}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: palette.bg, borderRadius: 10 }}>
                    <span style={{ fontSize: 18 }}>{cropIcon(record.crop)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: palette.dark }}>{record.crop}</div>
                      <div style={{ fontSize: 11.5, color: palette.muted }}>
                        {record.period}
                        {record.note ? ` · ${record.note}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
