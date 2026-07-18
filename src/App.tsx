import { useEffect, useMemo, useState } from 'react';
import type {
  AddCropForm,
  ColorMode,
  DashboardView,
  DrawMode,
  FarmState,
  Field,
  HistoryTrackingForm,
  InputMode,
  LoginForm,
  LngLat,
  Profile,
  Screen,
  StatusFilter,
  Subplot,
  SubplotData,
} from './types';
import { palettes } from './palette';
import { CROP_OPTIONS } from './seedData';
import { formatDateLabel } from './lib/fieldHelpers';
import { EMPTY_FARM, loadSession, saveSession, clearSession } from './lib/storage';
import {
  addCrop as addCropApi,
  clearFieldCrop,
  fetchFields,
  identify as identifyApi,
  type IdentifyResult as ApiIdentifyResult,
  setFieldCrop,
  updateField as updateFieldApi,
} from './lib/api';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import MapPopup from './components/MapPopup';
import LoginScreen from './screens/LoginScreen';
import IntroScreen from './screens/IntroScreen';
import FarmMapScreen from './screens/FarmMapScreen';
import DashboardScreen from './screens/DashboardScreen';
import FieldDetailScreen from './screens/FieldDetailScreen';
import IdentifyScreen, { type ScanResult } from './screens/IdentifyScreen';
import AddCropScreen from './screens/AddCropScreen';
import HistoryTrackingScreen from './screens/HistoryTrackingScreen';
import ProfileScreen from './screens/ProfileScreen';

const HEADER_MAP: Record<Exclude<Screen, 'detail' | 'intro'>, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: 'Field Intelligence', title: 'Your Fields' },
  camera: { eyebrow: 'Field Intelligence', title: 'Identify' },
  history: { eyebrow: 'Field Intelligence', title: 'History Tracking' },
  profile: { eyebrow: 'Field Intelligence', title: 'Profile' },
  addCrop: { eyebrow: 'Field Intelligence', title: 'Add Crop' },
  farmMap: { eyebrow: 'Field Intelligence', title: 'Farm Map' },
};

const EMPTY_HISTORY_FORM: HistoryTrackingForm = {
  cropName: '',
  datePlanted: '',
  harvestDate: '',
  yieldAmount: '',
  fertilizerUsed: '',
  pesticidesApplied: '',
};

function readInitialSession() {
  return loadSession();
}

export default function App() {
  const saved = useMemo(() => readInitialSession(), []);

  const [colorMode, setColorMode] = useState<ColorMode>('traffic-light');
  const [authed, setAuthed] = useState(Boolean(saved?.userName));
  const [introSeen, setIntroSeen] = useState(Boolean(saved?.introSeen));
  const [userName, setUserName] = useState(saved?.userName ?? '');
  const [loginForm, setLoginForm] = useState<LoginForm>({ name: saved?.userName ?? '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [farm, setFarm] = useState<FarmState>(saved?.farm ?? EMPTY_FARM);
  const [drawMode, setDrawMode] = useState<DrawMode>('idle');
  const [selectedSubplotId, setSelectedSubplotId] = useState<string | null>(null);
  const [draftAreaAcres, setDraftAreaAcres] = useState(0);
  const [drawError, setDrawError] = useState<string | null>(null);

  const [screen, setScreen] = useState<Screen>(
    saved?.userName ? (saved.introSeen ? (saved.farm.farmPolygon ? 'dashboard' : 'farmMap') : 'intro') : 'dashboard',
  );
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingCrop, setEditingCrop] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | false>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dashboardView, setDashboardView] = useState<DashboardView>('cards');
  const [mapPopupFieldId, setMapPopupFieldId] = useState<string | null>(null);

  const [addForm, setAddForm] = useState<AddCropForm>({ cropName: '', photoAdded: false, date: '', plotName: '' });
  const [addCropSaving, setAddCropSaving] = useState(false);
  const [addCropError, setAddCropError] = useState<string | null>(null);

  const [historyForm, setHistoryForm] = useState<HistoryTrackingForm>(EMPTY_HISTORY_FORM);
  const [historySaving, setHistorySaving] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFields()
      .then((data) => {
        if (cancelled) return;
        setFields(data);
        setFieldsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFieldsError(err instanceof Error ? err.message : 'Failed to load fields.');
        setFieldsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist session whenever farm / auth state changes
  useEffect(() => {
    if (!authed || !userName) return;
    saveSession({ userName, introSeen, farm });
  }, [authed, userName, introSeen, farm]);

  const [inputMode, setInputMode] = useState<InputMode>('photo');
  const [captured, setCaptured] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [textQuery, setTextQuery] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile>({
    name: saved?.userName || 'Jordan Hale',
    farmName: 'Hale Family Farm',
    location: 'Cedar County, IA',
    acres: String(saved?.farm.farmAreaAcres || '183'),
    crops: 'Corn, Soybeans, Wheat',
    equipment: 'handheld',
    units: 'acres',
  });

  const palette = palettes[colorMode];

  const visibleFields = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return fields.filter(
      (f) =>
        (statusFilter === 'all' || f.status === statusFilter) &&
        (!q || f.name.toLowerCase().includes(q) || f.crop.toLowerCase().includes(q)),
    );
  }, [fields, searchQuery, statusFilter]);

  const rotateNowCount = fields.filter((f) => f.status === 'rotate').length;
  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? fields[0];
  const mapPopupField = fields.find((f) => f.id === mapPopupFieldId) ?? null;
  const plotNames = useMemo(() => [...new Set(fields.map((f) => f.name))], [fields]);
  const cropNames = useMemo(() => [...new Set(fields.map((f) => f.crop).filter(Boolean))], [fields]);

  const activeTab = (
    screen === 'detail' || screen === 'addCrop' || screen === 'farmMap'
      ? screen === 'farmMap'
        ? 'farmMap'
        : 'dashboard'
      : screen
  ) as 'dashboard' | 'camera' | 'history' | 'profile' | 'farmMap';

  const showBack = screen === 'detail' || screen === 'addCrop' || (screen === 'camera' && captured);
  const header =
    screen === 'detail'
      ? { eyebrow: `${selectedField.crop} · ${selectedField.acres} ac`, title: selectedField.name }
      : HEADER_MAP[screen as Exclude<Screen, 'detail' | 'intro'>];

  function signIn() {
    if (!loginForm.name.trim() || !loginForm.password.trim()) {
      setLoginError('Enter your name and password to continue.');
      return;
    }
    const name = loginForm.name.trim();
    setUserName(name);
    setProfile((p) => ({ ...p, name }));
    setAuthed(true);
    setLoginError('');
    if (!introSeen) {
      setScreen('intro');
    } else {
      setScreen(farm.farmPolygon ? 'dashboard' : 'farmMap');
    }
  }

  function signOut() {
    setAuthed(false);
    setLoginForm({ name: '', password: '' });
    setLoginError('');
    setUserName('');
    setIntroSeen(false);
    setFarm(EMPTY_FARM);
    setDrawMode('idle');
    setSelectedSubplotId(null);
    clearSession();
  }

  function finishIntro() {
    setIntroSeen(true);
    setScreen('farmMap');
    if (!farm.farmPolygon) setDrawMode('farm');
  }

  function handleFarmComplete(coords: LngLat[], acres: number) {
    setFarm((prev) => ({
      farmPolygon: coords,
      farmAreaAcres: acres,
      // Redrawing the boundary invalidates subplot containment — clear them.
      subplots: prev.farmPolygon ? [] : prev.subplots,
    }));
    setSelectedSubplotId(null);
    setProfile((p) => ({ ...p, acres: String(acres) }));
    setDrawMode('idle');
    setDraftAreaAcres(0);
  }

  function handleSubplotComplete(subplot: Subplot) {
    setFarm((f) => ({ ...f, subplots: [...f.subplots, subplot] }));
    setDrawMode('idle');
    setDraftAreaAcres(0);
  }

  function handleUpdateSubplotData(id: string, data: SubplotData) {
    setFarm((f) => ({
      ...f,
      subplots: f.subplots.map((s) => (s.id === id ? { ...s, data } : s)),
    }));
  }

  function handleDeleteSubplot(id: string) {
    setFarm((f) => ({ ...f, subplots: f.subplots.filter((s) => s.id !== id) }));
    setSelectedSubplotId(null);
  }

  function handleClearFarm() {
    setFarm(EMPTY_FARM);
    setSelectedSubplotId(null);
    setDrawMode('farm');
    setDrawError(null);
    setDraftAreaAcres(0);
  }

  function selectField(id: string) {
    if (editMode) {
      toggleSelect(id);
      return;
    }
    setScreen('detail');
    setSelectedFieldId(id);
    setActionMessage(false);
    setEditingCrop(false);
  }

  function back() {
    setScreen('dashboard');
    setActionMessage(false);
    setEditingCrop(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function applyFieldUpdate(updated: Field) {
    setFields((fs) => fs.map((f) => (f.id === updated.id ? updated : f)));
  }

  async function clearSelected() {
    if (!selectedIds.length) return;
    const ids = selectedIds;
    setSelectedIds([]);
    try {
      const updates = await Promise.all(ids.map((id) => clearFieldCrop(id)));
      setFields((fs) => fs.map((f) => updates.find((u) => u.id === f.id) ?? f));
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to clear selected fields.');
    }
  }

  async function saveAddCrop() {
    const { cropName, date, plotName, photoAdded } = addForm;
    if (!cropName.trim() || !plotName.trim()) return;
    setAddCropSaving(true);
    setAddCropError(null);
    try {
      const updated = await addCropApi({
        cropName: cropName.trim(),
        plotName: plotName.trim(),
        date: date ? formatDateLabel(date) : undefined,
        photoAdded,
      });
      setFields((fs) => {
        const idx = fs.findIndex((f) => f.id === updated.id);
        if (idx >= 0) {
          const next = [...fs];
          next[idx] = updated;
          return next;
        }
        return [...fs, updated];
      });
      setScreen('dashboard');
    } catch (err) {
      setAddCropError(err instanceof Error ? err.message : 'Failed to save planting.');
    } finally {
      setAddCropSaving(false);
    }
  }

  async function saveHistory() {
    const { cropName, datePlanted } = historyForm;
    if (!cropName.trim() || !datePlanted.trim()) return;
    setHistorySaving(true);
    setHistoryError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setHistoryForm(EMPTY_HISTORY_FORM);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to save history.');
    } finally {
      setHistorySaving(false);
    }
  }

  function cancelHistory() {
    setHistoryForm(EMPTY_HISTORY_FORM);
    setHistoryError(null);
  }

  async function clearCropInDetail() {
    try {
      applyFieldUpdate(await clearFieldCrop(selectedFieldId));
      setEditingCrop(false);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to clear crop.');
    }
  }

  async function setCrop(cropName: string) {
    try {
      applyFieldUpdate(await setFieldCrop(selectedFieldId, cropName));
      setEditingCrop(false);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to update crop.');
    }
  }

  function updateFieldName(name: string) {
    setFields((fs) => fs.map((f) => (f.id === selectedFieldId ? { ...f, name } : f)));
  }

  function updateFieldAcres(acres: string) {
    setFields((fs) => fs.map((f) => (f.id === selectedFieldId ? { ...f, acres } : f)));
  }

  async function commitFieldName() {
    const current = fields.find((f) => f.id === selectedFieldId);
    if (!current) return;
    try {
      applyFieldUpdate(await updateFieldApi(current.id, { name: current.name }));
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to save field name.');
    }
  }

  async function commitFieldAcres() {
    const current = fields.find((f) => f.id === selectedFieldId);
    if (!current) return;
    try {
      applyFieldUpdate(await updateFieldApi(current.id, { acres: current.acres }));
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to save acreage.');
    }
  }

  function buildScanResult(result: ApiIdentifyResult): ScanResult {
    return {
      species: result.species,
      isWeed: result.isWeed,
      tagLabel: result.isWeed ? 'Weed' : 'Crop',
      tagBg: result.isWeed ? palette.rotate.bg : palette.safe.bg,
      tagText: result.isWeed ? palette.rotate.text : palette.safe.text,
      reason: result.reason,
      confidence: result.confidence,
    };
  }

  async function runIdentify(payload: { imageBase64?: string; description?: string }) {
    setCaptured(true);
    setIdentifying(true);
    setIdentifyError(null);
    setScanResult(null);
    try {
      setScanResult(buildScanResult(await identifyApi(payload)));
    } catch (err) {
      setIdentifyError(err instanceof Error ? err.message : 'Failed to identify.');
    } finally {
      setIdentifying(false);
    }
  }

  function handleCapture(imageBase64: string) {
    runIdentify({ imageBase64 });
  }

  function handleSubmitText() {
    if (!textQuery.trim()) return;
    runIdentify({ description: textQuery.trim() });
  }

  const shellMaxWidth = screen === 'farmMap' ? 720 : 480;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        background: '#E7E4DA',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: shellMaxWidth,
          minHeight: '100dvh',
          background: palette.bg,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {!authed ? (
          <LoginScreen
            palette={palette}
            loginForm={loginForm}
            loginError={loginError}
            onChangeName={(name) => setLoginForm((s) => ({ ...s, name }))}
            onChangePassword={(password) => setLoginForm((s) => ({ ...s, password }))}
            onSignIn={signIn}
          />
        ) : screen === 'intro' ? (
          <IntroScreen palette={palette} userName={userName} onContinue={finishIntro} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%' }}>
            <Header palette={palette} eyebrow={header.eyebrow} title={header.title} showBack={showBack} onBack={back} />

            <div
              style={{
                flex: 1,
                overflowY: screen === 'farmMap' ? 'hidden' : 'auto',
                padding: '16px 16px 16px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              {screen === 'farmMap' && (
                <FarmMapScreen
                  palette={palette}
                  farm={farm}
                  drawMode={drawMode}
                  selectedSubplotId={selectedSubplotId}
                  draftAreaAcres={draftAreaAcres}
                  drawError={drawError}
                  onSetDrawMode={setDrawMode}
                  onFarmComplete={handleFarmComplete}
                  onSubplotComplete={handleSubplotComplete}
                  onSelectSubplot={setSelectedSubplotId}
                  onUpdateSubplotData={handleUpdateSubplotData}
                  onDeleteSubplot={handleDeleteSubplot}
                  onClearFarm={handleClearFarm}
                  onDraftAreaChange={setDraftAreaAcres}
                  onDrawError={setDrawError}
                  onDone={() => setScreen('dashboard')}
                />
              )}

              {screen === 'dashboard' && fieldsLoading && (
                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13.5, color: palette.muted }}>
                  Loading fields…
                </div>
              )}

              {screen === 'dashboard' && !fieldsLoading && fieldsError && (
                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13.5, color: palette.muted }}>
                  Couldn't load fields from the server: {fieldsError}
                </div>
              )}

              {screen === 'dashboard' && !fieldsLoading && !fieldsError && (
                <DashboardScreen
                  palette={palette}
                  fields={visibleFields}
                  allFieldsCount={fields.length}
                  rotateNowCount={rotateNowCount}
                  view={dashboardView}
                  onSetView={setDashboardView}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onSetStatusFilter={setStatusFilter}
                  editMode={editMode}
                  onToggleEditMode={() => {
                    setEditMode((v) => !v);
                    setSelectedIds([]);
                  }}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onClearSelected={clearSelected}
                  onSelectField={selectField}
                  onShowMapPopup={setMapPopupFieldId}
                  onAddCrop={() => {
                    setAddForm({ cropName: '', photoAdded: false, date: '', plotName: '' });
                    setScreen('addCrop');
                  }}
                  onOpenFarmMap={() => setScreen('farmMap')}
                  farm={farm}
                />
              )}

              {screen === 'detail' && selectedField && (
                <FieldDetailScreen
                  palette={palette}
                  field={selectedField}
                  editingCrop={editingCrop}
                  actionMessage={actionMessage}
                  onStartEditCrop={() => setEditingCrop(true)}
                  onCancelEditCrop={() => setEditingCrop(false)}
                  onSelectCrop={setCrop}
                  onClearCrop={clearCropInDetail}
                  onAccept={() => setActionMessage('Recommendation accepted.')}
                  onOverride={() => setActionMessage('Marked as overridden by farmer.')}
                  onDismiss={() => setActionMessage('Recommendation dismissed.')}
                  onUpdateName={updateFieldName}
                  onUpdateAcres={updateFieldAcres}
                  onCommitName={commitFieldName}
                  onCommitAcres={commitFieldAcres}
                />
              )}

              {screen === 'camera' && (
                <IdentifyScreen
                  palette={palette}
                  inputMode={inputMode}
                  onSetPhotoMode={() => {
                    setInputMode('photo');
                    setCaptured(false);
                    setTextQuery('');
                  }}
                  onSetTextMode={() => {
                    setInputMode('text');
                    setCaptured(false);
                  }}
                  captured={captured}
                  onCapture={handleCapture}
                  onRetake={() => {
                    setCaptured(false);
                    setFlagged(false);
                    setTextQuery('');
                    setScanResult(null);
                    setIdentifyError(null);
                  }}
                  textQuery={textQuery}
                  onChangeTextQuery={setTextQuery}
                  onSubmitText={handleSubmitText}
                  scanResult={scanResult}
                  identifying={identifying}
                  identifyError={identifyError}
                  flagged={flagged}
                  onToggleFlag={() => setFlagged((v) => !v)}
                />
              )}

              {screen === 'history' && (
                <HistoryTrackingScreen
                  palette={palette}
                  form={historyForm}
                  cropNames={cropNames}
                  saving={historySaving}
                  error={historyError}
                  onChangeCropName={(cropName) => setHistoryForm((s) => ({ ...s, cropName }))}
                  onChangeDatePlanted={(datePlanted) => setHistoryForm((s) => ({ ...s, datePlanted }))}
                  onChangeHarvestDate={(harvestDate) => setHistoryForm((s) => ({ ...s, harvestDate }))}
                  onChangeYield={(yieldAmount) => setHistoryForm((s) => ({ ...s, yieldAmount }))}
                  onChangeFertilizerUsed={(fertilizerUsed) => setHistoryForm((s) => ({ ...s, fertilizerUsed }))}
                  onChangePesticidesApplied={(pesticidesApplied) => setHistoryForm((s) => ({ ...s, pesticidesApplied }))}
                  onSave={saveHistory}
                  onCancel={cancelHistory}
                />
              )}

              {screen === 'addCrop' && (
                <AddCropScreen
                  palette={palette}
                  form={addForm}
                  plotNames={plotNames}
                  saving={addCropSaving}
                  error={addCropError}
                  onChangeCropName={(cropName) => setAddForm((s) => ({ ...s, cropName }))}
                  onChangeDate={(date) => setAddForm((s) => ({ ...s, date }))}
                  onChangePlotName={(plotName) => setAddForm((s) => ({ ...s, plotName }))}
                  onTogglePhoto={() =>
                    setAddForm((s) => ({ ...s, photoAdded: !s.photoAdded, cropName: s.cropName || CROP_OPTIONS[0] }))
                  }
                  onSave={saveAddCrop}
                  onCancel={() => setScreen('dashboard')}
                />
              )}

              {screen === 'profile' && (
                <ProfileScreen
                  palette={palette}
                  profile={profile}
                  colorMode={colorMode}
                  onChangeField={(field, value) => setProfile((s) => ({ ...s, [field]: value }))}
                  onSelectEquipment={(equipment) => setProfile((s) => ({ ...s, equipment }))}
                  onSelectUnits={(units) => setProfile((s) => ({ ...s, units }))}
                  onSelectColorMode={setColorMode}
                  onSignOut={signOut}
                />
              )}
            </div>

            {mapPopupField && (
              <MapPopup
                palette={palette}
                field={mapPopupField}
                onClose={() => setMapPopupFieldId(null)}
                onViewDetails={() => {
                  setScreen('detail');
                  setSelectedFieldId(mapPopupField.id);
                  setMapPopupFieldId(null);
                }}
              />
            )}

            <BottomNav palette={palette} activeTab={activeTab} onNavigate={setScreen} />
          </div>
        )}
      </div>
    </div>
  );
}
