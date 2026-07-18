import type { Palette } from '../palette';
import type { CropRotationRecommendation } from '../types';
import { fieldLabelStyle } from '../lib/formStyles';

interface CropRotationScreenProps {
  palette: Palette;
  recommendations: CropRotationRecommendation[];
  loading?: boolean;
  error?: string | null;
  onRetry: () => void;
  onBack: () => void;
}

export default function CropRotationScreen({
  palette,
  recommendations,
  loading = false,
  error = null,
  onRetry,
  onBack,
}: CropRotationScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {loading && (
        <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13.5, color: palette.muted }}>
          Finding rotation pairings…
        </div>
      )}

      {!loading && error && (
        <>
          <div style={{ background: palette.card, borderRadius: 16, padding: 16, fontSize: 13.5, color: palette.dark, lineHeight: 1.5 }}>
            Couldn't generate rotation recommendations: {error}
          </div>
          <div onClick={onRetry} style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: palette.accent, cursor: 'pointer' }}>
            Try again
          </div>
        </>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13.5, color: palette.muted }}>
          No rotation pairings yet.
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommendations.map((rec, index) => (
              <div key={index} style={{ background: palette.card, borderRadius: 16, padding: 16 }}>
                <div style={fieldLabelStyle(palette)}>Pair {rec.currentCrop} with</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: palette.dark }}>{rec.recommendedCrop}</div>
              </div>
            ))}
          </div>
          <div onClick={onBack} style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: palette.accent, cursor: 'pointer' }}>
            Back
          </div>
        </>
      )}
    </div>
  );
}
