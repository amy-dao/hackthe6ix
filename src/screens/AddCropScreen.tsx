import type { Palette } from '../palette';
import type { AddCropForm } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';

interface AddCropScreenProps {
  palette: Palette;
  form: AddCropForm;
  plotNames: string[];
  onChangeCropName: (value: string) => void;
  onChangeDate: (value: string) => void;
  onChangePlotName: (value: string) => void;
  onTogglePhoto: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function AddCropScreen({
  palette,
  form,
  plotNames,
  onChangeCropName,
  onChangeDate,
  onChangePlotName,
  onTogglePhoto,
  onSave,
  onCancel,
}: AddCropScreenProps) {
  const canSave = form.cropName.trim().length > 0 && form.plotName.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={fieldLabelStyle(palette)}>Crop or plant name</div>
          <input
            value={form.cropName}
            onChange={(e) => onChangeCropName(e.target.value)}
            placeholder="e.g. Corn, Soybeans"
            style={fieldInputStyle(palette)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            onClick={onTogglePhoto}
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: form.photoAdded ? palette.safe.bg : palette.bg,
              border: '1.5px dashed rgba(15,45,38,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: form.photoAdded ? palette.safe.text : palette.dark }}>
              {form.photoAdded ? '✓' : '+'}
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: palette.muted, lineHeight: 1.4 }}>
            {form.photoAdded ? `Photo added — identified as ${form.cropName || 'crop'}` : 'Add a photo to auto-identify (optional)'}
          </div>
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Date planted</div>
          <input type="date" value={form.date} onChange={(e) => onChangeDate(e.target.value)} style={fieldInputStyle(palette)} />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Plot of land</div>
          <input
            value={form.plotName}
            onChange={(e) => onChangePlotName(e.target.value)}
            list="existingPlots"
            placeholder="Choose existing or type a new plot name"
            style={fieldInputStyle(palette)}
          />
          <datalist id="existingPlots">
            {plotNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>
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
        Save planting
      </div>
      <div onClick={onCancel} style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: palette.muted, cursor: 'pointer' }}>
        Cancel
      </div>
    </div>
  );
}
