import { useEffect, useState } from 'react';
import type { Palette } from '../palette';
import type { Profile } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';

interface ProfileScreenProps {
  palette: Palette;
  profile: Profile;
  username: string;
  accountSaving: boolean;
  accountError: string;
  onChangeField: (field: keyof Profile, value: string) => void;
  onUpdateAccount: (updates: {
    username?: string;
    password?: string;
    farmerName?: string;
    farmName?: string;
    location?: string;
  }) => void;
}

export default function ProfileScreen({
  palette,
  profile,
  username,
  accountSaving,
  accountError,
  onChangeField,
  onUpdateAccount,
}: ProfileScreenProps) {
  const [newUsername, setNewUsername] = useState(username);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setNewUsername(username);
  }, [username]);

  function handleSaveAccount() {
    const trimmed = newUsername.trim();
    const updates: { username?: string; password?: string } = {};
    if (trimmed && trimmed !== username) updates.username = trimmed;
    if (newPassword) updates.password = newPassword;
    if (!updates.username && !updates.password) return;
    onUpdateAccount(updates);
    setNewPassword('');
  }

  function handleSaveProfile() {
    onUpdateAccount({
      farmerName: profile.name.trim(),
      farmName: profile.farmName.trim(),
      location: profile.location.trim(),
    });
  }

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

        <div
          onClick={accountSaving ? undefined : handleSaveProfile}
          style={{
            textAlign: 'center',
            padding: '12px 0',
            borderRadius: 12,
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 700,
            fontSize: 14,
            cursor: accountSaving ? 'default' : 'pointer',
            opacity: accountSaving ? 0.6 : 1,
          }}
        >
          {accountSaving ? 'Saving…' : 'Save profile'}
        </div>
      </div>

      <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ ...fieldLabelStyle(palette), marginBottom: 0 }}>Account</div>
        <div>
          <div style={fieldLabelStyle(palette)}>Username</div>
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            autoComplete="username"
            style={fieldInputStyle(palette)}
          />
        </div>
        <div>
          <div style={fieldLabelStyle(palette)}>New password</div>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            autoComplete="new-password"
            style={fieldInputStyle(palette)}
          />
        </div>

        {accountError && (
          <div style={{ fontSize: 12.5, color: palette.rotate.bg, fontWeight: 600 }}>{accountError}</div>
        )}

        <div
          onClick={accountSaving ? undefined : handleSaveAccount}
          style={{
            textAlign: 'center',
            padding: '12px 0',
            borderRadius: 12,
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 700,
            fontSize: 14,
            cursor: accountSaving ? 'default' : 'pointer',
            opacity: accountSaving ? 0.6 : 1,
          }}
        >
          {accountSaving ? 'Saving…' : 'Save account changes'}
        </div>
      </div>
    </div>
  );
}
