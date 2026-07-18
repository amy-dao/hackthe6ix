import type { Palette } from '../palette';
import type { Screen } from '../types';

interface BottomNavProps {
  palette: Palette;
  activeTab: 'dashboard' | 'camera' | 'profile';
  onNavigate: (screen: Screen) => void;
}

const TABS: { key: 'dashboard' | 'camera' | 'profile'; label: string; screen: Screen; shape: 'square' | 'circle' | 'ring' }[] = [
  { key: 'dashboard', label: 'Fields', screen: 'dashboard', shape: 'square' },
  { key: 'camera', label: 'Identify', screen: 'camera', shape: 'circle' },
  { key: 'profile', label: 'Profile', screen: 'profile', shape: 'ring' },
];

export default function BottomNav({ palette, activeTab, onNavigate }: BottomNavProps) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', borderTop: '1px solid rgba(15,45,38,0.1)', background: palette.card }}>
      {TABS.map((tab) => {
        const color = activeTab === tab.key ? palette.accent : palette.muted;
        return (
          <div
            key={tab.key}
            onClick={() => onNavigate(tab.screen)}
            data-testid={`nav-${tab.key}`}
            style={{ flex: 1, padding: '10px 0 12px', textAlign: 'center', cursor: 'pointer' }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: tab.shape === 'circle' || tab.shape === 'ring' ? '50%' : 5,
                margin: '0 auto 4px',
                background: tab.shape === 'ring' ? 'transparent' : color,
                border: tab.shape === 'ring' ? `2px solid ${color}` : 'none',
              }}
            />
            <div style={{ fontSize: 10.5, fontWeight: 700, color }}>{tab.label}</div>
          </div>
        );
      })}
    </div>
  );
}
