import type { Palette } from '../../palette';
import type { CropSuggestionResult } from '../../lib/cropSuggestions';

interface CropSuggestionPanelProps {
  palette: Palette;
  suggestion: CropSuggestionResult;
}

/** Shown when rotation recommendation is YES — crops + NPK reasoning. */
export default function CropSuggestionPanel({ palette, suggestion }: CropSuggestionPanelProps) {
  if (suggestion.suggested_crops.length === 0 && !suggestion.suggestion_reason) return null;

  return (
    <div
      style={{
        background: 'rgba(95,122,61,0.08)',
        border: '1.5px solid rgba(95,122,61,0.22)',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: '#5F7A3D',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Recommended crops
      </div>
      {suggestion.suggested_crops.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {suggestion.suggested_crops.map((crop) => (
            <li key={crop} style={{ fontSize: 14, fontWeight: 700, color: palette.dark }}>
              {crop}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 13, color: palette.muted, fontStyle: 'italic' }}>No specific crop picks yet.</div>
      )}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: palette.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 4,
          }}
        >
          Reason
          {suggestion.npk_deficiency ? ` · ${suggestion.npk_deficiency} low` : ''}
        </div>
        <div style={{ fontSize: 12.5, color: palette.dark, lineHeight: 1.45, fontWeight: 600 }}>
          {suggestion.suggestion_reason}
        </div>
      </div>
    </div>
  );
}
