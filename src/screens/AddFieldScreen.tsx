import type { Palette } from '../palette';
import type { AddFieldForm } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';
import { titleCase } from '../lib/fieldHelpers';
import CropEntryEditor from '../components/CropEntryEditor';

const PH_MIN = 3.5;
const PH_MAX = 9;

interface AddFieldScreenProps {
  palette: Palette;
  form: AddFieldForm;
  cropOptions: string[];
  soilTypeOptions: string[];
  saving?: boolean;
  error?: string | null;
  onChangePlotName: (value: string) => void;
  onChangeAcres: (value: string) => void;
  onChangeSoilPh: (value: string) => void;
  onToggleSoilPhUnknown: () => void;
  onChangeSoilType: (value: string) => void;
  onAddCropEntry: () => void;
  onRemoveCropEntry: (index: number) => void;
  onChangeCropEntryCrop: (index: number, crop: string) => void;
  onChangeCropEntryMonth: (index: number, month: string) => void;
  onSetCurrentEntry: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

function selectStyle(palette: Palette) {
  return { ...fieldInputStyle(palette), appearance: 'auto' as const, cursor: 'pointer' };
}

export default function AddFieldScreen({
  palette,
  form,
  cropOptions,
  soilTypeOptions,
  saving = false,
  error = null,
  onChangePlotName,
  onChangeAcres,
  onChangeSoilPh,
  onToggleSoilPhUnknown,
  onChangeSoilType,
  onAddCropEntry,
  onRemoveCropEntry,
  onChangeCropEntryCrop,
  onChangeCropEntryMonth,
  onSetCurrentEntry,
  onSave,
  onCancel,
}: AddFieldScreenProps) {
  const acresValue = Number(form.acres);
  const acresValid = form.acres.trim() !== '' && Number.isFinite(acresValue) && acresValue > 0;

  const phValue = Number(form.soilPh);
  const phValid = form.soilPhUnknown || (form.soilPh.trim() !== '' && Number.isFinite(phValue) && phValue >= PH_MIN && phValue <= PH_MAX);

  const entriesValid = form.cropEntries.every((e) => e.crop.trim() !== '' && e.month.trim() !== '');
  const currentCount = form.cropEntries.filter((e) => e.isCurrent).length;

  const canSave =
    !saving &&
    form.plotName.trim().length > 0 &&
    form.soilType.trim().length > 0 &&
    acresValid &&
    phValid &&
    entriesValid &&
    currentCount <= 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={fieldLabelStyle(palette)}>Plot name</div>
          <input
            value={form.plotName}
            onChange={(e) => onChangePlotName(e.target.value)}
            placeholder="e.g. North 40"
            style={fieldInputStyle(palette)}
          />
        </div>

        <div>
          <div style={fieldLabelStyle(palette)}>Field/plot size (acres)</div>
          <input
            type="number"
            min={0}
            step="0.1"
            value={form.acres}
            onChange={(e) => onChangeAcres(e.target.value)}
            placeholder="e.g. 42"
            style={fieldInputStyle(palette)}
          />
          {!acresValid && form.acres.trim() !== '' && (
            <div style={{ fontSize: 11.5, color: palette.rotate.bg, marginTop: 4 }}>Enter a size greater than 0.</div>
          )}
        </div>

        <div>
          <div style={fieldLabelStyle(palette)}>Soil pH</div>
          <input
            type="number"
            min={PH_MIN}
            max={PH_MAX}
            step="0.1"
            value={form.soilPh}
            disabled={form.soilPhUnknown}
            onChange={(e) => onChangeSoilPh(e.target.value)}
            placeholder="e.g. 6.2"
            style={{ ...fieldInputStyle(palette), opacity: form.soilPhUnknown ? 0.5 : 1 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12.5, color: palette.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.soilPhUnknown} onChange={onToggleSoilPhUnknown} />
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
          <select value={form.soilType} onChange={(e) => onChangeSoilType(e.target.value)} style={selectStyle(palette)}>
            <option value="">Select soil type…</option>
            {soilTypeOptions.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <CropEntryEditor
        palette={palette}
        cropOptions={cropOptions}
        entries={form.cropEntries}
        onAddCropEntry={onAddCropEntry}
        onRemoveCropEntry={onRemoveCropEntry}
        onChangeCropEntryCrop={onChangeCropEntryCrop}
        onChangeCropEntryMonth={onChangeCropEntryMonth}
        onSetCurrentEntry={onSetCurrentEntry}
      />

      {error && (
        <div style={{ fontSize: 12.5, color: palette.rotate.text, background: palette.rotate.bg, borderRadius: 10, padding: '10px 12px' }}>
          {error}
        </div>
      )}
      <div
        onClick={canSave ? onSave : undefined}
        style={{
          textAlign: 'center',
          padding: '14px 0',
          borderRadius: 12,
          background: palette.dark,
          color: palette.offwhite,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          opacity: canSave ? 1 : 0.45,
        }}
      >
        {saving ? 'Saving…' : 'Save field'}
      </div>
      <div onClick={onCancel} style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: palette.muted, cursor: 'pointer' }}>
        Cancel
      </div>
    </div>
  );
}
