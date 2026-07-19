import type { CSSProperties } from 'react';
import type { DrawMode, EditTarget, FarmState, LngLat, Subplot, SubplotData } from '../types';
import type { Palette } from '../palette';
import InteractiveFarmMap from '../components/map/InteractiveFarmMap';
import SubplotForm from '../components/map/SubplotForm';

interface FarmMapScreenProps {
  palette: Palette;
  farm: FarmState;
  drawMode: DrawMode;
  editTarget: EditTarget | null;
  selectedSubplotId: string | null;
  draftAreaAcres: number;
  drawError: string | null;
  cropOptions: string[];
  soilTypeOptions: string[];
  syncingSubplotId: string | null;
  syncError: string | null;
  onSetDrawMode: (mode: DrawMode) => void;
  onFarmComplete: (coords: LngLat[], acres: number) => void;
  onSubplotComplete: (subplot: Subplot) => void;
  onSelectSubplot: (id: string | null) => void;
  onUpdateSubplotData: (id: string, data: SubplotData) => void;
  onSaveSubplot: (id: string) => void;
  onDeleteSubplot: (id: string) => void;
  onClearFarm: () => void;
  onDraftAreaChange: (acres: number) => void;
  onDrawError: (message: string | null) => void;
  onViewField: (fieldId: string) => void;
  onDone: () => void;
  onStartEditFarmBoundary: () => void;
  onStartEditSubplot: (id: string) => void;
  onFinishEditing: () => void;
  onEditFarmBoundary: (coords: LngLat[], acres: number) => void;
  onEditSubplot: (id: string, coords: LngLat[], areaAcres: number) => void;
}

function ToolButton({
  label,
  active,
  disabled,
  palette,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  palette: Palette;
  onClick: () => void;
}) {
  const style: CSSProperties = {
    border: 'none',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    background: active ? palette.dark : palette.card,
    color: active ? palette.offwhite : palette.dark,
    whiteSpace: 'nowrap',
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={style}>
      {label}
    </button>
  );
}

export default function FarmMapScreen({
  palette,
  farm,
  drawMode,
  editTarget,
  selectedSubplotId,
  draftAreaAcres,
  drawError,
  cropOptions,
  soilTypeOptions,
  syncingSubplotId,
  syncError,
  onSetDrawMode,
  onFarmComplete,
  onSubplotComplete,
  onSelectSubplot,
  onUpdateSubplotData,
  onSaveSubplot,
  onDeleteSubplot,
  onClearFarm,
  onDraftAreaChange,
  onDrawError,
  onViewField,
  onDone,
  onStartEditFarmBoundary,
  onStartEditSubplot,
  onFinishEditing,
  onEditFarmBoundary,
  onEditSubplot,
}: FarmMapScreenProps) {
  const selected = farm.subplots.find((s) => s.id === selectedSubplotId) ?? null;
  const drawing = drawMode === 'farm' || drawMode === 'subplot';
  const editing = drawMode === 'edit' && editTarget !== null;
  const editingSubplot = editing && editTarget?.type === 'subplot' ? farm.subplots.find((s) => s.id === editTarget.id) ?? null : null;
  const liveArea =
    drawing && draftAreaAcres > 0
      ? draftAreaAcres
      : editingSubplot
        ? editingSubplot.areaAcres
        : editing && editTarget?.type === 'farm'
          ? farm.farmAreaAcres
          : selected
            ? selected.areaAcres
            : farm.farmAreaAcres;

  const liveLabel = drawing
    ? drawMode === 'farm'
      ? 'Farm (drawing)'
      : 'Field (drawing)'
    : editingSubplot
      ? `${editingSubplot.data.name || 'Field'} (editing)`
      : editing && editTarget?.type === 'farm'
        ? 'Farm (editing)'
        : selected
          ? selected.data.name || 'Field'
          : farm.farmPolygon
            ? 'Farm total'
            : 'Area';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 0 }}>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingBottom: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <ToolButton
            palette={palette}
            label={farm.farmPolygon ? 'Redraw farm' : 'Draw farm'}
            active={drawMode === 'farm'}
            onClick={() => {
              onDrawError(null);
              onSelectSubplot(null);
              onSetDrawMode(drawMode === 'farm' ? 'idle' : 'farm');
            }}
          />
          <ToolButton
            palette={palette}
            label="Draw field"
            active={drawMode === 'subplot'}
            disabled={!farm.farmPolygon}
            onClick={() => {
              onDrawError(null);
              onSelectSubplot(null);
              onSetDrawMode(drawMode === 'subplot' ? 'idle' : 'subplot');
            }}
          />
          <ToolButton
            palette={palette}
            label="Select"
            active={drawMode === 'idle' || drawMode === 'edit'}
            onClick={() => {
              onDrawError(null);
              onSetDrawMode('idle');
            }}
          />
          {farm.farmPolygon && (
            <ToolButton
              palette={palette}
              label="Edit boundary"
              active={editing && editTarget?.type === 'farm'}
              onClick={() => {
                if (editing && editTarget?.type === 'farm') onFinishEditing();
                else onStartEditFarmBoundary();
              }}
            />
          )}
          {farm.farmPolygon && (
            <ToolButton
              palette={palette}
              label="Clear farm"
              onClick={() => {
                if (window.confirm('Clear the farm boundary and all subplots?')) onClearFarm();
              }}
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: palette.card,
            borderRadius: 12,
            padding: '10px 14px',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {liveLabel}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: palette.dark }}>
              {liveArea > 0 ? `${liveArea.toFixed(2)} ac` : '—'}
            </div>
          </div>
          <div style={{ fontSize: 12, color: palette.muted, textAlign: 'right', lineHeight: 1.35 }}>
            {drawing ? (
              <>
                Click to place points.
                <br />
                Close near the red start, or double-click.
              </>
            ) : editing ? (
              <>
                Drag a point to move it.
                <br />
                Tap a point to remove it.
              </>
            ) : farm.farmPolygon ? (
              <>
                {farm.subplots.length} field{farm.subplots.length === 1 ? '' : 's'}
                <br />
                Tap a plot to edit data
              </>
            ) : (
              'Start by drawing your farm boundary'
            )}
          </div>
        </div>

        {drawError && (
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: palette.rotate.bg,
              background: 'rgba(192,57,43,0.08)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            {drawError}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 320,
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
          border: '1.5px solid rgba(15,45,38,0.12)',
        }}
      >
        <InteractiveFarmMap
          palette={palette}
          farm={farm}
          drawMode={drawMode}
          editTarget={editTarget}
          selectedSubplotId={selectedSubplotId}
          onFarmComplete={onFarmComplete}
          onSubplotComplete={onSubplotComplete}
          onSelectSubplot={(id) => {
            onSetDrawMode('idle');
            onSelectSubplot(id);
          }}
          onDraftAreaChange={onDraftAreaChange}
          onDrawError={onDrawError}
          onEditFarmBoundary={onEditFarmBoundary}
          onEditSubplot={onEditSubplot}
        />
      </div>

      {farm.subplots.length > 0 && !selected && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingTop: 12,
          }}
        >
          {farm.subplots.map((sp) => (
            <button
              key={sp.id}
              type="button"
              onClick={() => onSelectSubplot(sp.id)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                background: palette.card,
                borderRadius: 10,
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 700,
                color: palette.dark,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 3, background: sp.color }} />
              {sp.data.name || 'Field'} · {sp.areaAcres.toFixed(1)} ac
            </button>
          ))}
        </div>
      )}

      {selected && !editing && (
        <div style={{ flexShrink: 0, marginTop: 12, marginLeft: -16, marginRight: -16, marginBottom: -16 }}>
          <SubplotForm
            palette={palette}
            data={selected.data}
            areaAcres={selected.areaAcres}
            color={selected.color}
            cropOptions={cropOptions}
            soilTypeOptions={soilTypeOptions}
            saving={syncingSubplotId === selected.id}
            syncError={syncingSubplotId === selected.id ? syncError : null}
            onChange={(data) => onUpdateSubplotData(selected.id, data)}
            onSave={() => onSaveSubplot(selected.id)}
            onDelete={() => onDeleteSubplot(selected.id)}
            onClose={() => onSelectSubplot(null)}
            onViewField={onViewField}
            onEditPoints={() => onStartEditSubplot(selected.id)}
          />
        </div>
      )}

      {editing && (
        <button
          type="button"
          onClick={onFinishEditing}
          style={{
            flexShrink: 0,
            marginTop: 12,
            border: 'none',
            borderRadius: 12,
            padding: '13px 0',
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Done editing
        </button>
      )}

      {farm.farmPolygon && !selected && !drawing && !editing && (
        <button
          type="button"
          onClick={onDone}
          style={{
            flexShrink: 0,
            marginTop: 12,
            border: 'none',
            borderRadius: 12,
            padding: '13px 0',
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Continue to fields
        </button>
      )}
    </div>
  );
}
