import { useState } from 'react';
import type { Palette } from '../palette';
import type { Field } from '../types';
import { CROP_OPTIONS } from '../seedData';
import { statusMeta, cropIcon } from '../lib/fieldHelpers';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';

interface FieldDetailScreenProps {
  palette: Palette;
  field: Field;
  editingCrop: boolean;
  actionMessage: string | false;
  onStartEditCrop: () => void;
  onCancelEditCrop: () => void;
  onSelectCrop: (crop: string) => void;
  onClearCrop: () => void;
  onAccept: () => void;
  onOverride: () => void;
  onDismiss: () => void;
  onUpdateName: (name: string) => void;
  onUpdateAcres: (acres: string) => void;
  onCommitName: () => void;
  onCommitAcres: () => void;
}

type DetailTab = 'field' | 'crop' | 'history';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'field', label: 'Field' },
  { id: 'crop', label: 'Crop' },
  { id: 'history', label: 'History' },
];

export default function FieldDetailScreen({
  palette,
  field,
  editingCrop,
  actionMessage,
  onStartEditCrop,
  onCancelEditCrop,
  onSelectCrop,
  onClearCrop,
  onAccept,
  onOverride,
  onDismiss,
  onUpdateName,
  onUpdateAcres,
  onCommitName,
  onCommitAcres,
}: FieldDetailScreenProps) {
  const [tab, setTab] = useState<DetailTab>('crop');
  const meta = statusMeta(field.status, palette);
  const hasRiskScore = field.status !== 'empty';
  const hasSuggestedCrops = field.suggestedCrops.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: palette.dark }}>{field.crop}</div>
          <div style={{ fontSize: 13, color: palette.muted, marginTop: 2 }}>{field.acres} acres</div>
        </div>
        {tab === 'crop' && (
          <div onClick={onStartEditCrop} style={{ fontSize: 12.5, fontWeight: 700, color: palette.accent, cursor: 'pointer', whiteSpace: 'nowrap', paddingTop: 4 }}>
            Edit crop
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
        <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={fieldLabelStyle(palette)}>Field name</div>
            <input
              value={field.name}
              onChange={(e) => onUpdateName(e.target.value)}
              onBlur={onCommitName}
              style={fieldInputStyle(palette)}
            />
          </div>
          <div>
            <div style={fieldLabelStyle(palette)}>Acres</div>
            <input
              value={String(field.acres)}
              onChange={(e) => onUpdateAcres(e.target.value)}
              onBlur={onCommitAcres}
              style={fieldInputStyle(palette)}
            />
          </div>
        </div>
      )}

      {tab === 'crop' && (
        <>
          <div style={{ borderRadius: 18, background: meta.bg, padding: 18, color: meta.text }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>
              Rotation status
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{meta.label}</div>
            {hasRiskScore && (
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
              Confidence: <span style={{ fontWeight: 700, color: palette.dark }}>{field.confidence}</span> · last scanned {field.lastScan}
            </div>
          </div>

          {editingCrop && (
            <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                What's planted now?
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CROP_OPTIONS.map((name) => {
                  const active = field.crop === name;
                  return (
                    <div
                      key={name}
                      onClick={() => onSelectCrop(name)}
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
                      {name}
                    </div>
                  );
                })}
              </div>
              <div
                onClick={onClearCrop}
                style={{
                  textAlign: 'center',
                  padding: '11px 0',
                  borderRadius: 10,
                  background: 'transparent',
                  border: `1.5px solid ${palette.rotate.bg}`,
                  color: palette.rotate.bg,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                Clear crop — leave field empty
              </div>
              <div onClick={onCancelEditCrop} style={{ textAlign: 'center', fontSize: 12.5, color: palette.muted, cursor: 'pointer' }}>
                Cancel
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
        </>
      )}

      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
