import type { Palette } from '../palette';
import type { CropRotationRecommendation } from '../types';
import { fieldLabelStyle } from '../lib/formStyles';

interface RecommendationScreenProps {
  palette: Palette;
  recommendation: CropRotationRecommendation | null;
  loading?: boolean;
  error?: string | null;
  onRetry: () => void;
}

export default function RecommendationScreen({
  palette,
  recommendation,
  loading = false,
  error = null,
  onRetry,
}: RecommendationScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {loading && (
        <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13.5, color: palette.muted }}>
          Generating rotation recommendation…
        </div>
      )}

      {!loading && error && (
        <>
          <div style={{ background: palette.card, borderRadius: 16, padding: 16, fontSize: 13.5, color: palette.dark, lineHeight: 1.5 }}>
            Couldn't generate a recommendation: {error}
          </div>
          <div onClick={onRetry} style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: palette.accent, cursor: 'pointer' }}>
            Try again
          </div>
        </>
      )}

      {!loading && !error && !recommendation && (
        <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13.5, color: palette.muted }}>
          No recommendation yet.
        </div>
      )}

      {!loading && !error && recommendation && (
        <div style={{ background: palette.card, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={fieldLabelStyle(palette)}>Recommended crop</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: palette.dark }}>{recommendation.recommendedCrop}</div>
          </div>
          <div style={{ height: 1, background: 'rgba(15,45,38,0.1)' }} />
          <div>
            <div style={fieldLabelStyle(palette)}>Rotate by</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: palette.dark }}>{recommendation.rotationDate}</div>
          </div>
        </div>
      )}
    </div>
  );
}
