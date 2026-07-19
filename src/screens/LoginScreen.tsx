import type { Palette } from '../palette';
import type { LoginForm } from '../types';
import { fieldLabelStyle, fieldInputStyle } from '../lib/formStyles';
import cultivaLogo from '../assets/cultiva-logo.png';

interface LoginScreenProps {
  palette: Palette;
  loginForm: LoginForm;
  loginError: string;
  mode: 'login' | 'signup';
  submitting: boolean;
  onChangeName: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSignIn: () => void;
  onSelectMode: (mode: 'login' | 'signup') => void;
}

const TABS: { id: 'login' | 'signup'; label: string }[] = [
  { id: 'login', label: 'Sign in' },
  { id: 'signup', label: 'Create account' },
];

export default function LoginScreen({
  palette,
  loginForm,
  loginError,
  mode,
  submitting,
  onChangeName,
  onChangePassword,
  onSignIn,
  onSelectMode,
}: LoginScreenProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
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
        <img
          src={cultivaLogo}
          alt="Cultiva"
          style={{ height: 40, width: 'auto', objectFit: 'contain' }}
        />
      </div>

      <div style={{ background: palette.card, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 6, background: palette.bg, borderRadius: 12, padding: 4 }}>
          {TABS.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectMode(t.id)}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '9px 0',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                background: mode === t.id ? palette.dark : 'transparent',
                color: mode === t.id ? palette.offwhite : palette.muted,
              }}
            >
              {t.label}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12.5, color: palette.muted, textAlign: 'center' }}>
          {mode === 'login' ? 'Sign in to map your farm and subplots' : 'Create an account to get started'}
        </div>

        <div>
          <div style={fieldLabelStyle(palette)}>Username</div>
          <input
            value={loginForm.name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Your username"
            autoComplete="username"
            style={{ ...fieldInputStyle(palette), padding: 11, background: palette.bg }}
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
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            style={{ ...fieldInputStyle(palette), padding: 11, background: palette.bg }}
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
          disabled={submitting}
          style={{
            border: 'none',
            textAlign: 'center',
            padding: '14px 0',
            borderRadius: 12,
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 700,
            fontSize: 14,
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </div>
    </div>
  );
}
