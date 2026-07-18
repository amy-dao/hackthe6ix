import type { Palette } from '../palette';
import type { LoginForm } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';

interface LoginScreenProps {
  palette: Palette;
  loginForm: LoginForm;
  loginError: string;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSignIn: () => void;
}

export default function LoginScreen({ palette, loginForm, loginError, onChangeEmail, onChangePassword, onSignIn }: LoginScreenProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 28px', gap: 16, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: palette.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
          🌾
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: palette.dark }}>Field Intelligence</div>
        <div style={{ fontSize: 13, color: palette.muted, textAlign: 'center' }}>Sign in to view your fields</div>
      </div>

      <div>
        <div style={fieldLabelStyle(palette)}>Email</div>
        <input
          value={loginForm.email}
          onChange={(e) => onChangeEmail(e.target.value)}
          placeholder="you@farm.com"
          style={{ ...fieldInputStyle(palette), padding: 11, background: palette.card }}
        />
      </div>
      <div>
        <div style={fieldLabelStyle(palette)}>Password</div>
        <input
          type="password"
          value={loginForm.password}
          onChange={(e) => onChangePassword(e.target.value)}
          placeholder="••••••••"
          style={{ ...fieldInputStyle(palette), padding: 11, background: palette.card }}
        />
      </div>

      {loginError && (
        <div style={{ fontSize: 12.5, color: palette.rotate.bg, fontWeight: 600 }}>{loginError}</div>
      )}

      <div
        onClick={onSignIn}
        style={{
          textAlign: 'center',
          padding: '14px 0',
          borderRadius: 12,
          background: palette.dark,
          color: palette.offwhite,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Sign in
      </div>
    </div>
  );
}
