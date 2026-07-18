import type { Palette } from '../palette';
import type { LoginForm } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';

interface LoginScreenProps {
  palette: Palette;
  loginForm: LoginForm;
  loginError: string;
  onChangeName: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSignIn: () => void;
}

export default function LoginScreen({
  palette,
  loginForm,
  loginError,
  onChangeName,
  onChangePassword,
  onSignIn,
}: LoginScreenProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '32px 28px',
        gap: 16,
        boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${palette.bg} 0%, #DCE6D8 100%)`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: palette.dark,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 800,
            color: palette.offwhite,
          }}
        >
          FI
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: palette.dark }}>Field Intelligence</div>
        <div style={{ fontSize: 13, color: palette.muted, textAlign: 'center' }}>
          Sign in to map your farm and subplots
        </div>
      </div>

      <div>
        <div style={fieldLabelStyle(palette)}>Name</div>
        <input
          value={loginForm.name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          style={{ ...fieldInputStyle(palette), padding: 11, background: palette.card }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSignIn();
          }}
        />
      </div>
      <div>
        <div style={fieldLabelStyle(palette)}>Password</div>
        <input
          type="password"
          value={loginForm.password}
          onChange={(e) => onChangePassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          style={{ ...fieldInputStyle(palette), padding: 11, background: palette.card }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSignIn();
          }}
        />
      </div>

      {loginError && (
        <div style={{ fontSize: 12.5, color: palette.rotate.bg, fontWeight: 600 }}>{loginError}</div>
      )}

      <button
        type="button"
        onClick={onSignIn}
        style={{
          border: 'none',
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
      </button>
    </div>
  );
}
