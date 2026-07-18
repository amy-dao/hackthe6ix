import type { Palette } from '../palette';
import type { HistoryTrackingForm } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';

interface HistoryTrackingScreenProps {
  palette: Palette;
  form: HistoryTrackingForm;
  cropNames: string[];
  saving?: boolean;
  error?: string | null;
  onChangeCropName: (value: string) => void;
  onChangeDatePlanted: (value: string) => void;
  onChangeHarvestDate: (value: string) => void;
  onChangeYield: (value: string) => void;
  onChangeFertilizerUsed: (value: string) => void;
  onChangePesticidesApplied: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function HistoryTrackingScreen({
  palette,
  form,
  cropNames,
  saving = false,
  error = null,
  onChangeCropName,
  onChangeDatePlanted,
  onChangeHarvestDate,
  onChangeYield,
  onChangeFertilizerUsed,
  onChangePesticidesApplied,
  onSave,
  onCancel,
}: HistoryTrackingScreenProps) {
  const canSave = form.cropName.trim().length > 0 && form.datePlanted.trim().length > 0 && !saving;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={fieldLabelStyle(palette)}>Crop</div>
          <input
            value={form.cropName}
            onChange={(e) => onChangeCropName(e.target.value)}
            list="existingCrops"
            placeholder="e.g. Corn, Soybeans"
            style={fieldInputStyle(palette)}
          />
          <datalist id="existingCrops">
            {cropNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Date planted</div>
          <input
            type="date"
            value={form.datePlanted}
            onChange={(e) => onChangeDatePlanted(e.target.value)}
            style={fieldInputStyle(palette)}
          />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Harvest date</div>
          <input
            type="date"
            value={form.harvestDate}
            onChange={(e) => onChangeHarvestDate(e.target.value)}
            style={fieldInputStyle(palette)}
          />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Yield</div>
          <input
            value={form.yieldAmount}
            onChange={(e) => onChangeYield(e.target.value)}
            placeholder="e.g. 180 bu/acre"
            style={fieldInputStyle(palette)}
          />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Fertilizer used</div>
          <input
            value={form.fertilizerUsed}
            onChange={(e) => onChangeFertilizerUsed(e.target.value)}
            placeholder="e.g. Urea 46-0-0"
            style={fieldInputStyle(palette)}
          />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Pesticides applied</div>
          <input
            value={form.pesticidesApplied}
            onChange={(e) => onChangePesticidesApplied(e.target.value)}
            placeholder="e.g. Glyphosate"
            style={fieldInputStyle(palette)}
          />
        </div>
      </div>
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
        {saving ? 'Saving…' : 'Save history'}
      </div>
      <div onClick={onCancel} style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: palette.muted, cursor: 'pointer' }}>
        Cancel
      </div>
    </div>
  );
}
