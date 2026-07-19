import { useEffect, useMemo, useState } from 'react';
import type {
  AddFieldForm,
  ColorMode,
  CropRotationRecommendation,
  DashboardView,
  DrawMode,
  FarmState,
  Field,
  InputMode,
  LoginForm,
  LngLat,
  PlantingRecord,
  Profile,
  Screen,
  StatusFilter,
  Subplot,
  SubplotData,
} from './types';
import { palettes } from './palette';
import { EMPTY_FARM, loadSession, saveSession, clearSession } from './lib/storage';
import {
  addField as addFieldApi,
  clearFieldCrop,
  deleteField as deleteFieldApi,
  fetchFields,
  fetchReference,
  identify as identifyApi,
  type IdentifyResult as ApiIdentifyResult,
  login as loginApi,
  setAuthToken,
  setFieldCrop,
  signup as signupApi,
  syncField as syncFieldApi,
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
import AddFieldScreen from './screens/AddFieldScreen';
import RecommendationScreen from './screens/CropRecommendationScreen';
import ProfileScreen from './screens/ProfileScreen';

const HEADER_MAP: Record<Exclude<Screen, 'detail' | 'intro'>, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: 'Field Intelligence', title: 'Your Fields' },
  camera: { eyebrow: 'Field Intelligence', title: 'Identify' },
  recommendation: { eyebrow: 'Field Intelligence', title: 'Recommendation' },
  profile: { eyebrow: 'Field Intelligence', title: 'Profile' },
  addField: { eyebrow: 'Field Intelligence', title: 'Add Field' },
  farmMap: { eyebrow: 'Field Intelligence', title: 'Farm Map' },
};

const PH_MIN = 3.5;
const PH_MAX = 9;

const EMPTY_ADD_FIELD_FORM: AddFieldForm = {
  plotName: '',
  acres: '',
  soilPh: '',
  soilPhUnknown: false,
  soilType: '',
  cropEntries: [],
};

function readInitialSession() {
  const session = loadSession();
  setAuthToken(session?.token ?? null);
  return session;
}

export default function App() {
  const saved = useMemo(() => readInitialSession(), []);

  const [colorMode, setColorMode] = useState<ColorMode>('traffic-light');
  const [authed, setAuthed] = useState(Boolean(saved?.userName));
  const [introSeen, setIntroSeen] = useState(Boolean(saved?.introSeen));
  const [userName, setUserName] = useState(saved?.userName ?? '');
  const [sessionToken, setSessionToken] = useState(saved?.token ?? '');
  const [loginForm, setLoginForm] = useState<LoginForm>({ name: saved?.userName ?? '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [farm, setFarm] = useState<FarmState>(saved?.farm ?? EMPTY_FARM);
  const [drawMode, setDrawMode] = useState<DrawMode>('idle');
  const [selectedSubplotId, setSelectedSubplotId] = useState<string | null>(null);
  const [draftAreaAcres, setDraftAreaAcres] = useState(0);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [syncingSubplotId, setSyncingSubplotId] = useState<string | null>(null);
  const [subplotSyncError, setSubplotSyncError] = useState<string | null>(null);

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

  const [addForm, setAddForm] = useState<AddFieldForm>(EMPTY_ADD_FIELD_FORM);
  const [addFieldSaving, setAddFieldSaving] = useState(false);
  const [addFieldError, setAddFieldError] = useState<string | null>(null);

  const [referenceCrops, setReferenceCrops] = useState<string[]>([]);
  const [referenceSoilTypes, setReferenceSoilTypes] = useState<string[]>([]);

  const [recommendation, setRecommendation] = useState<CropRotationRecommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setFieldsLoading(true);
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
  }, [authed]);

  useEffect(() => {
    if (!authed || !userName || !sessionToken) return;
    saveSession({ userName, token: sessionToken, introSeen, farm });
  }, [authed, userName, sessionToken, introSeen, farm]);

  useEffect(() => {
    let cancelled = false;
    fetchReference()
      .then((data) => {
        if (cancelled) return;
        setReferenceCrops(data.crops);
        setReferenceSoilTypes(data.soilTypes);
      })
      .catch(() => {
        /* dropdowns render empty; Save stays disabled until a crop/soil type is picked */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen === 'recommendation' && !recommendation && !recommendationLoading) {
      fetchRecommendation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

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
    acres: saved ? String(saved.farm.farmAreaAcres) : '183',
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
  const selectedField = fields.find((f) => f.id === selectedFieldId);
  const mapPopupField = fields.find((f) => f.id === mapPopupFieldId) ?? null;

  const activeTab = (
    screen === 'detail' || screen === 'addField'
      ? 'dashboard'
      : screen === 'farmMap'
        ? 'farmMap'
        : screen
  ) as 'dashboard' | 'camera' | 'recommendation' | 'profile' | 'farmMap';

  const showBack = screen === 'detail' || screen === 'addField' || (screen === 'camera' && captured);
  const header =
    screen === 'detail'
      ? selectedField
        ? { eyebrow: `${selectedField.crop} · ${selectedField.acres} ac`, title: selectedField.name }
        : { eyebrow: 'Field Intelligence', title: 'Field' }
      : HEADER_MAP[screen as Exclude<Screen, 'detail' | 'intro'>];

  async function signIn() {
    const username = loginForm.name.trim();
    const password = loginForm.password;
    if (!username || !password) {
      setLoginError('Enter a username and password to continue.');
      return;
    }
    setAuthSubmitting(true);
    setLoginError('');
    try {
      const user = authMode === 'login' ? await loginApi(username, password) : await signupApi(username, password);
      setAuthToken(user.token);
      setUserName(user.username);
      setSessionToken(user.token);
      setProfile((p) => ({ ...p, name: user.username }));
      setAuthed(true);
      setFields([]);
      if (!introSeen) {
        setScreen('intro');
      } else {
        setScreen(farm.farmPolygon ? 'dashboard' : 'farmMap');
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Failed to sign in.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  function selectAuthMode(nextMode: 'login' | 'signup') {
    setAuthMode(nextMode);
    setLoginError('');
  }

  function signOut() {
    setAuthToken(null);
    setAuthed(false);
    setLoginForm({ name: '', password: '' });
    setLoginError('');
    setUserName('');
    setSessionToken('');
    setIntroSeen(false);
    setFarm(EMPTY_FARM);
    setDrawMode('idle');
    setSelectedSubplotId(null);
    setFields([]);
    setFieldsLoading(true);
    setFieldsError(null);
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

  async function handleSaveSubplot(id: string) {
    const subplot = farm.subplots.find((s) => s.id === id);
    if (!subplot || !subplot.data.name.trim()) return;

    setSyncingSubplotId(id);
    setSubplotSyncError(null);
    try {
      const synced = await syncFieldApi({
        name: subplot.data.name.trim(),
        acres: subplot.areaAcres,
        soilPh: subplot.data.soilPh === '' ? undefined : subplot.data.soilPh,
        soilType: subplot.data.soilType || undefined,
        cropEntries: subplot.data.cropEntries,
      });
      setFields((fs) => {
        const idx = fs.findIndex((f) => f.id === synced.id);
        if (idx >= 0) {
          const next = [...fs];
          next[idx] = synced;
          return next;
        }
        return [...fs, synced];
      });
      setFarm((f) => ({
        ...f,
        subplots: f.subplots.map((s) => (s.id === id ? { ...s, data: { ...s.data, linkedFieldId: synced.id } } : s)),
      }));
    } catch (err) {
      setSubplotSyncError(err instanceof Error ? err.message : 'Failed to save field.');
    } finally {
      setSyncingSubplotId(null);
    }
  }

  function viewFieldFromSubplot(fieldId: string) {
    setScreen('detail');
    setSelectedFieldId(fieldId);
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

  function onAddCropEntry() {
    setAddForm((s) => ({ ...s, cropEntries: [...s.cropEntries, { crop: '', month: '', isCurrent: false }] }));
  }

  function onRemoveCropEntry(index: number) {
    setAddForm((s) => ({ ...s, cropEntries: s.cropEntries.filter((_, i) => i !== index) }));
  }

  function onChangeCropEntryCrop(index: number, crop: string) {
    setAddForm((s) => ({ ...s, cropEntries: s.cropEntries.map((e, i) => (i === index ? { ...e, crop } : e)) }));
  }

  function onChangeCropEntryMonth(index: number, month: string) {
    setAddForm((s) => ({ ...s, cropEntries: s.cropEntries.map((e, i) => (i === index ? { ...e, month } : e)) }));
  }

  function onSetCurrentEntry(index: number) {
    setAddForm((s) => ({
      ...s,
      cropEntries: s.cropEntries.map((e, i) => ({ ...e, isCurrent: i === index ? !e.isCurrent : false })),
    }));
  }

  async function saveAddField() {
    const { plotName, acres, soilPh, soilPhUnknown, soilType, cropEntries } = addForm;
    const acresNum = Number(acres);
    const phNum = Number(soilPh);
    const acresValid = acres.trim() !== '' && Number.isFinite(acresNum) && acresNum > 0;
    const phValid = soilPhUnknown || (soilPh.trim() !== '' && Number.isFinite(phNum) && phNum >= PH_MIN && phNum <= PH_MAX);
    const entriesValid = cropEntries.every((e) => e.crop.trim() !== '' && e.month.trim() !== '');
    const currentCount = cropEntries.filter((e) => e.isCurrent).length;
    if (!plotName.trim() || !soilType.trim() || !acresValid || !phValid || !entriesValid || currentCount > 1) return;

    setAddFieldSaving(true);
    setAddFieldError(null);
    try {
      const created = await addFieldApi({
        name: plotName.trim(),
        acres: acresNum,
        soilPh: soilPhUnknown ? undefined : phNum,
        soilType,
        cropEntries,
      });
      setFields((fs) => [...fs, created]);
      setScreen('dashboard');
    } catch (err) {
      setAddFieldError(err instanceof Error ? err.message : 'Failed to save field.');
    } finally {
      setAddFieldSaving(false);
    }
  }

  async function deleteSelectedField() {
    const id = selectedFieldId;
    try {
      await deleteFieldApi(id);
      setFields((fs) => fs.filter((f) => f.id !== id));
      setSelectedIds((ids) => ids.filter((x) => x !== id));
      back();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to delete field.');
    }
  }

  async function fetchRecommendation() {
    setRecommendationLoading(true);
    setRecommendationError(null);
    try {
      // TODO: replace with the real AI model call once the endpoint is available,
      // e.g. const result = await getCropRotationRecommendation(selectedField?.id);
      const result: CropRotationRecommendation = await new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              recommendedCrop: 'Soybeans',
              rotationDate: 'October 15, 2026',
            }),
          400,
        ),
      );
      setRecommendation(result);
    } catch (err) {
      setRecommendationError(err instanceof Error ? err.message : 'Failed to load recommendation.');
    } finally {
      setRecommendationLoading(false);
    }
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

  async function saveFieldEdits(updates: { name: string; acres: number; soilPh?: number; soilType: string }) {
    try {
      applyFieldUpdate(await updateFieldApi(selectedFieldId, updates));
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to save field.');
    }
  }

  function addHistoryRecord(record: PlantingRecord) {
    setFields((fs) =>
      fs.map((f) => (f.id === selectedFieldId ? { ...f, history: [record, ...f.history] } : f)),
    );
    // TODO: also persist this to the backend, e.g.
    // fetch('http://localhost:8000/api/history', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ fieldId: selectedFieldId, ...record }),
    // });
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
            mode={authMode}
            submitting={authSubmitting}
            onChangeName={(name) => setLoginForm((s) => ({ ...s, name }))}
            onChangePassword={(password) => setLoginForm((s) => ({ ...s, password }))}
            onSignIn={signIn}
            onSelectMode={selectAuthMode}
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
                  cropOptions={referenceCrops}
                  soilTypeOptions={referenceSoilTypes}
                  syncingSubplotId={syncingSubplotId}
                  syncError={subplotSyncError}
                  onSetDrawMode={setDrawMode}
                  onFarmComplete={handleFarmComplete}
                  onSubplotComplete={handleSubplotComplete}
                  onSelectSubplot={setSelectedSubplotId}
                  onUpdateSubplotData={handleUpdateSubplotData}
                  onSaveSubplot={handleSaveSubplot}
                  onDeleteSubplot={handleDeleteSubplot}
                  onClearFarm={handleClearFarm}
                  onDraftAreaChange={setDraftAreaAcres}
                  onDrawError={setDrawError}
                  onViewField={viewFieldFromSubplot}
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
                  onAddField={() => {
                    setAddForm(EMPTY_ADD_FIELD_FORM);
                    setAddFieldError(null);
                    setScreen('addField');
                  }}
                  onOpenFarmMap={() => setScreen('farmMap')}
                  farm={farm}
                />
              )}

              {screen === 'detail' && selectedField && (
                <FieldDetailScreen
                  key={selectedField.id}
                  palette={palette}
                  field={selectedField}
                  cropOptions={referenceCrops}
                  soilTypeOptions={referenceSoilTypes}
                  editingCrop={editingCrop}
                  actionMessage={actionMessage}
                  onStartEditCrop={() => setEditingCrop(true)}
                  onCancelEditCrop={() => setEditingCrop(false)}
                  onSelectCrop={setCrop}
                  onClearCrop={clearCropInDetail}
                  onAccept={() => setActionMessage('Recommendation accepted.')}
                  onOverride={() => setActionMessage('Marked as overridden by farmer.')}
                  onDismiss={() => setActionMessage('Recommendation dismissed.')}
                  onSaveField={saveFieldEdits}
                  onDeleteField={deleteSelectedField}
                  onAddHistoryRecord={addHistoryRecord}
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

              {screen === 'recommendation' && (
                <RecommendationScreen
                  palette={palette}
                  recommendation={recommendation}
                  loading={recommendationLoading}
                  error={recommendationError}
                  onRetry={fetchRecommendation}
                />
              )}

              {screen === 'addField' && (
                <AddFieldScreen
                  palette={palette}
                  form={addForm}
                  cropOptions={referenceCrops}
                  soilTypeOptions={referenceSoilTypes}
                  saving={addFieldSaving}
                  error={addFieldError}
                  onChangePlotName={(plotName) => setAddForm((s) => ({ ...s, plotName }))}
                  onChangeAcres={(acres) => setAddForm((s) => ({ ...s, acres }))}
                  onChangeSoilPh={(soilPh) => setAddForm((s) => ({ ...s, soilPh }))}
                  onToggleSoilPhUnknown={() =>
                    setAddForm((s) => ({ ...s, soilPhUnknown: !s.soilPhUnknown, soilPh: s.soilPhUnknown ? s.soilPh : '' }))
                  }
                  onChangeSoilType={(soilType) => setAddForm((s) => ({ ...s, soilType }))}
                  onAddCropEntry={onAddCropEntry}
                  onRemoveCropEntry={onRemoveCropEntry}
                  onChangeCropEntryCrop={onChangeCropEntryCrop}
                  onChangeCropEntryMonth={onChangeCropEntryMonth}
                  onSetCurrentEntry={onSetCurrentEntry}
                  onSave={saveAddField}
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
