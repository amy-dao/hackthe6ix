import { useEffect, useRef, useState } from 'react';
import type { Palette } from '../palette';
import type { InputMode } from '../types';
import { fieldLabelStyle } from '../lib/formStyles';

export interface ScanResult {
  species: string;
  isWeed: boolean;
  tagLabel: string;
  tagBg: string;
  tagText: string;
  reason: string;
  confidence: string;
}

interface IdentifyScreenProps {
  palette: Palette;
  inputMode: InputMode;
  onSetPhotoMode: () => void;
  onSetTextMode: () => void;
  captured: boolean;
  onCapture: () => void;
  onRetake: () => void;
  textQuery: string;
  onChangeTextQuery: (value: string) => void;
  onSubmitText: () => void;
  scanResult: ScanResult;
  flagged: boolean;
  onToggleFlag: () => void;
}

export default function IdentifyScreen({
  palette,
  inputMode,
  onSetPhotoMode,
  onSetTextMode,
  captured,
  onCapture,
  onRetake,
  textQuery,
  onChangeTextQuery,
  onSubmitText,
  scanResult,
  flagged,
  onToggleFlag,
}: IdentifyScreenProps) {
  const isPhotoMode = inputMode === 'photo';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamError, setStreamError] = useState(false);

  useEffect(() => {
    if (!isPhotoMode || captured) return;
    let active = true;
    let currentStream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        currentStream = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStreamError(false);
      })
      .catch(() => setStreamError(true));
    return () => {
      active = false;
      currentStream?.getTracks().forEach((t) => t.stop());
    };
  }, [isPhotoMode, captured]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!captured && (
        <div style={{ display: 'flex', gap: 6, background: palette.card, borderRadius: 12, padding: 4 }}>
          <div
            onClick={onSetPhotoMode}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '9px 0',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: isPhotoMode ? palette.dark : 'transparent',
              color: isPhotoMode ? palette.offwhite : palette.muted,
            }}
          >
            Photo
          </div>
          <div
            onClick={onSetTextMode}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '9px 0',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: !isPhotoMode ? palette.dark : 'transparent',
              color: !isPhotoMode ? palette.offwhite : palette.muted,
            }}
          >
            Describe it
          </div>
        </div>
      )}

      {isPhotoMode && (
        <>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3/4',
              borderRadius: 18,
              background: 'linear-gradient(135deg,#1B3A2B,#0F2D26)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {!captured && !streamError && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <div style={{ position: 'absolute', inset: 14, border: '2px dashed rgba(245,243,236,0.35)', borderRadius: 14 }} />
            {!captured && (
              <div style={{ position: 'relative', color: 'rgba(245,243,236,0.75)', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '0 30px' }}>
                {streamError ? 'Camera unavailable — grant camera access, then tap capture' : 'Point camera at the plant, then tap capture'}
              </div>
            )}
            {captured && (
              <div style={{ width: '70%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(95,168,211,0.18)', border: `2px solid ${palette.accent}` }} />
            )}
          </div>

          {!captured && (
            <div
              onClick={onCapture}
              data-testid="capture-button"
              style={{ alignSelf: 'center', width: 72, height: 72, borderRadius: '50%', background: palette.offwhite, border: `5px solid ${palette.dark}`, cursor: 'pointer' }}
            />
          )}
        </>
      )}

      {!isPhotoMode && !captured && (
        <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={fieldLabelStyle(palette)}>Describe what you see</div>
          <textarea
            value={textQuery}
            onChange={(e) => onChangeTextQuery(e.target.value)}
            placeholder="e.g. spiky leaves, purple stem, growing between corn rows"
            style={{
              width: '100%',
              minHeight: 90,
              boxSizing: 'border-box',
              border: '1.5px solid rgba(15,45,38,0.15)',
              borderRadius: 10,
              padding: 10,
              fontSize: 14,
              fontFamily: 'inherit',
              color: palette.dark,
              resize: 'none',
              background: palette.bg,
            }}
          />
          <div
            onClick={onSubmitText}
            style={{ textAlign: 'center', padding: '13px 0', borderRadius: 12, background: palette.dark, color: palette.offwhite, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Identify
          </div>
        </div>
      )}

      {captured && (
        <>
          <div style={{ background: palette.card, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={fieldLabelStyle(palette)}>Identified</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: palette.dark }}>{scanResult.species}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 20, background: scanResult.tagBg, color: scanResult.tagText }}>
                {scanResult.tagLabel}
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13.5, color: palette.dark, lineHeight: 1.5 }}>{scanResult.reason}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: palette.muted }}>
              Confidence <span style={{ fontWeight: 700, color: palette.dark }}>{scanResult.confidence}</span>
            </div>

            {scanResult.isWeed && (
              <div
                onClick={onToggleFlag}
                style={{
                  marginTop: 12,
                  textAlign: 'center',
                  padding: '12px 0',
                  borderRadius: 12,
                  background: flagged ? palette.safe.bg : palette.dark,
                  color: flagged ? palette.safe.text : palette.offwhite,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {flagged ? 'Flagged as weed ✓' : 'Flag weed'}
              </div>
            )}
          </div>
          <div onClick={onRetake} style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: palette.accent, cursor: 'pointer' }}>
            {isPhotoMode ? 'Retake photo' : 'Try another description'}
          </div>
        </>
      )}
    </div>
  );
}
