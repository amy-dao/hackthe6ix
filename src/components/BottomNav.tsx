import { useState } from 'react';
import { SquaresFour, MapPin, Camera, Lightbulb, User, type Icon } from '@phosphor-icons/react';
import type { Palette } from '../palette';
import type { Screen } from '../types';

interface BottomNavProps {
  palette: Palette;
  activeTab: 'dashboard' | 'camera' | 'recommendation' | 'profile' | 'farmMap';
  onNavigate: (screen: Screen) => void;
}

// A warm moss green — fits the farm/field aesthetic better than the app's
// cool blue accent, which is shared with buttons/links across every screen.
const EARTH_ACCENT = '#5F7A3D';
const EARTH_ACCENT_SOFT = 'rgba(95,122,61,0.12)';

const TABS: {
  key: 'dashboard' | 'farmMap' | 'camera' | 'recommendation' | 'profile';
  label: string;
  screen: Screen;
  Icon: Icon;
}[] = [
  { key: 'dashboard', label: 'Fields', screen: 'dashboard', Icon: SquaresFour },
  { key: 'farmMap', label: 'Map', screen: 'farmMap', Icon: MapPin },
  { key: 'camera', label: 'Identify', screen: 'camera', Icon: Camera },
  { key: 'recommendation', label: 'Recommend', screen: 'recommendation', Icon: Lightbulb },
  { key: 'profile', label: 'Profile', screen: 'profile', Icon: User },
];

export default function BottomNav({ palette, activeTab, onNavigate }: BottomNavProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        gap: 4,
        borderTop: '1px solid rgba(15,45,38,0.1)',
        background: palette.card,
        padding: '8px 8px 10px',
      }}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        const hovered = hoveredKey === tab.key;
        const color = active || hovered ? EARTH_ACCENT : palette.muted;
        return (
          <div
            key={tab.key}
            onClick={() => onNavigate(tab.screen)}
            onMouseEnter={() => setHoveredKey(tab.key)}
            onMouseLeave={() => setHoveredKey((k) => (k === tab.key ? null : k))}
            data-testid={`nav-${tab.key}`}
            style={{
              flex: 1,
              padding: '12px 4px 13px',
              textAlign: 'center',
              cursor: 'pointer',
              borderRadius: 14,
              background: active || hovered ? EARTH_ACCENT_SOFT : 'transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <tab.Icon size={20} weight={active ? 'fill' : 'regular'} color={color} />
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color, transition: 'color 0.15s ease' }}>{tab.label}</div>
          </div>
        );
      })}
    </div>
  );
}
