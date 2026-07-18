import type { Palette } from '../palette';
import type { ColorMode, Profile } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';

interface ProfileScreenProps {
  palette: Palette;
  profile: Profile;
  colorMode: ColorMode;
  onChangeField: (field: keyof Profile, value: string) => void;
  onSelectEquipment: (value: Profile['equipment']) => void;
  onSelectUnits: (value: Profile['units']) => void;
  onSelectColorMode: (value: ColorMode) => void;
  onSignOut: () => void;
}

const EQUIPMENT_OPTIONS: { id: Profile['equipment']; label: string }[] = [
  { id: 'handheld', label: 'Handheld' },
  { id: 'drone', label: 'Drone' },
  { id: 'tractor', label: 'Tractor-mounted' },
];

const UNIT_OPTIONS: { id: Profile['units']; label: string }[] = [
  { id: 'acres', label: 'Acres' },
  { id: 'hectares', label: 'Hectares' },
];

const COLOR_MODE_OPTIONS: { id: ColorMode; label: string }[] = [
  { id: 'traffic-light', label: 'Traffic light' },
  { id: 'earth-tone', label: 'Earth tone' },
];

export default function ProfileScreen({
  palette,
  profile,
  colorMode,
  onChangeField,
  onSelectEquipment,
  onSelectUnits,
  onSelectColorMode,
  onSignOut,
}: ProfileScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={fieldLabelStyle(palette)}>Farmer name</div>
          <input value={profile.name} onChange={(e) => onChangeField('name', e.target.value)} style={fieldInputStyle(palette)} />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Farm name</div>
          <input value={profile.farmName} onChange={(e) => onChangeField('farmName', e.target.value)} style={fieldInputStyle(palette)} />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Location</div>
          <input
            value={profile.location}
            onChange={(e) => onChangeField('location', e.target.value)}
            placeholder="County, state or GPS coordinates"
            style={fieldInputStyle(palette)}
          />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Total acreage</div>
          <input value={profile.acres} onChange={(e) => onChangeField('acres', e.target.value)} style={fieldInputStyle(palette)} />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>Primary crops</div>
          <input value={profile.crops} onChange={(e) => onChangeField('crops', e.target.value)} style={fieldInputStyle(palette)} />
        </div>
      </div>

      <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...fieldLabelStyle(palette), marginBottom: 0 }}>Scanning equipment</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {EQUIPMENT_OPTIONS.map((opt) => {
            const active = profile.equipment === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => onSelectEquipment(opt.id)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '9px 4px',
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: active ? palette.dark : palette.bg,
                  color: active ? palette.offwhite : palette.muted,
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...fieldLabelStyle(palette), marginBottom: 0 }}>Measurement units</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {UNIT_OPTIONS.map((opt) => {
            const active = profile.units === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => onSelectUnits(opt.id)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '9px 4px',
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: active ? palette.dark : palette.bg,
                  color: active ? palette.offwhite : palette.muted,
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...fieldLabelStyle(palette), marginBottom: 0 }}>Status color theme</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {COLOR_MODE_OPTIONS.map((opt) => {
            const active = colorMode === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => onSelectColorMode(opt.id)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '9px 4px',
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: active ? palette.dark : palette.bg,
                  color: active ? palette.offwhite : palette.muted,
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>

      <div
        onClick={onSignOut}
        style={{
          textAlign: 'center',
          padding: '13px 0',
          borderRadius: 12,
          background: 'transparent',
          border: `1.5px solid ${palette.rotate.bg}`,
          color: palette.rotate.bg,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Sign out
      </div>
    </div>
  );
}
