import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AddFieldForm,
  ColorMode,
  CropEntryForm,
  DrawMode,
  EditTarget,
  FarmState,
  Field,
  InputMode,
  LngLat,
  PlantingRecord,
  Profile,
  Screen,
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
  predictRecommendation,
  setAuthToken,
  setFieldCrop,
  syncField as syncFieldApi,
  updateAccount as updateAccountApi,
  updateField as updateFieldApi,
} from './lib/api';
import { subplotToPredictPayload } from './lib/mlPredict';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import IntroScreen from './screens/IntroScreen';
import FarmMapScreen from './screens/FarmMapScreen';
import FieldsPage from './screens/FieldsPage';
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

// No login screen for now — every visitor auto-signs in as this shared
// account. Remove this and restore LoginScreen to bring real sign-in back.
const AUTO_LOGIN_USERNAME = 'person';
const AUTO_LOGIN_PASSWORD = 'hello';

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

  const colorMode: ColorMode = 'traffic-light';
  const [authed, setAuthed] = useState(Boolean(saved?.userName));
  const [introSeen, setIntroSeen] = useState(Boolean(saved?.introSeen));
  const [userName, setUserName] = useState(saved?.userName ?? '');
  const [sessionToken, setSessionToken] = useState(saved?.token ?? '');
  const [autoLoginError, setAutoLoginError] = useState('');

  const [farm, setFarm] = useState<FarmState>(saved?.farm ?? EMPTY_FARM);
  const [drawMode, setDrawMode] = useState<DrawMode>('idle');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [selectedSubplotId, setSelectedSubplotId] = useState<string | null>(null);
  const [draftAreaAcres, setDraftAreaAcres] = useState(0);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [syncingSubplotId, setSyncingSubplotId] = useState<string | null>(null);
  const [subplotSyncError, setSubplotSyncError] = useState<string | null>(null);
  const inferTimers = useRef<Record<string, number>>({});
  const farmRef = useRef(farm);
  farmRef.current = farm;

  useEffect(() => {
    if (drawMode !== 'edit') setEditTarget(null);
  }, [drawMode]);

  const [screen, setScreen] = useState<Screen>(
    saved?.userName ? (saved.introSeen ? (saved.farm.farmPolygon ? 'dashboard' : 'farmMap') : 'intro') : 'dashboard',
  );
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [editingCrop, setEditingCrop] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | false>(false);

  const [addForm, setAddForm] = useState<AddFieldForm>(EMPTY_ADD_FIELD_FORM);
  const [addFieldSaving, setAddFieldSaving] = useState(false);
  const [addFieldError, setAddFieldError] = useState<string | null>(null);

  const [referenceCrops, setReferenceCrops] = useState<string[]>([]);
  const [referenceSoilTypes, setReferenceSoilTypes] = useState<string[]>([]);
  const [focusSubplotId, setFocusSubplotId] = useState<string | null>(null);

  useEffect(() => {
    if (authed) return;
    let cancelled = false;
    loginApi(AUTO_LOGIN_USERNAME, AUTO_LOGIN_PASSWORD)
      .then((user) => {
        if (cancelled) return;
        setAuthToken(user.token);
        setUserName(user.username);
        setSessionToken(user.token);
        setAuthed(true);
        if (!introSeen) {
          setScreen('intro');
        } else {
          setScreen(farm.farmPolygon ? 'dashboard' : 'farmMap');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAutoLoginError(err instanceof Error ? err.message : 'Failed to sign in.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    fetchFields()
      .then((data) => {
        if (cancelled) return;
        setFields(data);
      })
      .catch(() => {
        /* Fields tab uses local farm geometry; API fields still hydrate for detail views when available. */
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
        /* Local CROP_REFERENCE / SOIL_TYPES fill dropdowns when the API is offline. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [inputMode, setInputMode] = useState<InputMode>('photo');
  const [captured, setCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [textQuery, setTextQuery] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  useEffect(() => {
    if (screen !== 'camera') {
      setInputMode('photo');
      setCaptured(false);
      setCapturedImage(null);
      setFlagged(false);
      setTextQuery('');
      setScanResult(null);
      setIdentifyError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const [profile, setProfile] = useState<Profile>({
    name: saved?.userName || 'Jordan Hale',
    farmName: 'Hale Family Farm',
    location: 'Cedar County, IA',
  });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState('');

  const palette = palettes[colorMode];

  const selectedField = fields.find((f) => f.id === selectedFieldId);

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
        ? { eyebrow: `${selectedField.crop} · ${selectedField.acres} acres`, title: selectedField.name }
        : { eyebrow: 'Field Intelligence', title: 'Field' }
      : HEADER_MAP[screen as Exclude<Screen, 'detail' | 'intro'>];

  async function updateAccount(updates: { username?: string; password?: string }) {
    setAccountSaving(true);
    setAccountError('');
    try {
      const user = await updateAccountApi(updates);
      setAuthToken(user.token);
      setSessionToken(user.token);
      setUserName(user.username);
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Failed to update account.');
    } finally {
      setAccountSaving(false);
    }
  }

  function signOut() {
    setAuthToken(null);
    setAuthed(false);
    setAutoLoginError('');
    setUserName('');
    setSessionToken('');
    setIntroSeen(false);
    setFarm(EMPTY_FARM);
    setDrawMode('idle');
    setSelectedSubplotId(null);
    setFields([]);
    setAccountError('');
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
    setDrawMode('idle');
    setDraftAreaAcres(0);
  }

  function handleSubplotComplete(subplot: Subplot) {
    setFarm((f) => ({ ...f, subplots: [...f.subplots, subplot] }));
    setDrawMode('idle');
    setDraftAreaAcres(0);
  }

  function startEditFarmBoundary() {
    setSelectedSubplotId(null);
    setDrawError(null);
    setEditTarget({ type: 'farm' });
    setDrawMode('edit');
  }

  function startEditSubplot(id: string) {
    setDrawError(null);
    setEditTarget({ type: 'subplot', id });
    setDrawMode('edit');
  }

  function finishEditing() {
    setDrawMode('idle');
    setEditTarget(null);
  }

  function handleEditFarmBoundary(coords: LngLat[], acres: number) {
    setFarm((f) => ({ ...f, farmPolygon: coords, farmAreaAcres: acres }));
  }

  function handleEditSubplotShape(id: string, coords: LngLat[], areaAcres: number) {
    setFarm((f) => ({
      ...f,
      subplots: f.subplots.map((s) => (s.id === id ? { ...s, coordinates: coords, areaAcres } : s)),
    }));
  }

  function handleUpdateSubplotData(id: string, data: SubplotData) {
    setFarm((f) => ({
      ...f,
      subplots: f.subplots.map((s) => (s.id === id ? { ...s, data } : s)),
    }));

    // Debounced auto-inference: when soil/crops/ph become complete, score silently.
    const existing = inferTimers.current[id];
    if (existing) window.clearTimeout(existing);
    inferTimers.current[id] = window.setTimeout(() => {
      void (async () => {
        const subplot = farmRef.current.subplots.find((s) => s.id === id);
        if (!subplot) return;
        const latest: Subplot = { ...subplot, data };
        try {
          const res = await predictRecommendation(subplotToPredictPayload(latest));
          const rec = res.recommendations ?? {
            rotation_recommendation: 'Unknown' as const,
            soil_exhaustion_score: 'Unknown' as const,
            rotation_label: 'Unknown',
          };
          setFarm((f) => ({
            ...f,
            subplots: f.subplots.map((s) =>
              s.id === id ? { ...s, data: { ...s.data, recommendations: rec } } : s,
            ),
          }));
        } catch {
          /* offline / models not loaded — keep local heuristic */
        }
      })();
    }, 400);
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
        cropEntries: subplot.data.cropEntries.map((e) => ({
          ...e,
          month: e.month || (e.startDate ? e.startDate.slice(0, 7) : ''),
          startDate: e.startDate || '',
          endDate: e.endDate || '',
        })),
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
        subplots: f.subplots.map((s) =>
          s.id === id
            ? {
                ...s,
                data: {
                  ...s.data,
                  linkedFieldId: synced.id,
                  recommendations: synced.recommendations ?? s.data.recommendations ?? null,
                },
              }
            : s,
        ),
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

  function back() {
    setScreen('dashboard');
    setActionMessage(false);
    setEditingCrop(false);
  }

  function applyFieldUpdate(updated: Field) {
    setFields((fs) => fs.map((f) => (f.id === updated.id ? updated : f)));
  }

  function onAddCropEntry() {
    setAddForm((s) => ({
      ...s,
      cropEntries: [...s.cropEntries, { crop: '', month: '', startDate: '', endDate: '', isCurrent: false }],
    }));
  }

  function onRemoveCropEntry(index: number) {
    setAddForm((s) => ({ ...s, cropEntries: s.cropEntries.filter((_, i) => i !== index) }));
  }

  function onChangeCropEntryCrop(index: number, crop: string, meta?: CropEntryForm['meta']) {
    setAddForm((s) => ({
      ...s,
      cropEntries: s.cropEntries.map((e, i) => (i === index ? { ...e, crop, meta } : e)),
    }));
  }

  function onChangeCropEntryDates(index: number, dates: { startDate: string; endDate: string; month: string }) {
    setAddForm((s) => ({
      ...s,
      cropEntries: s.cropEntries.map((e, i) => (i === index ? { ...e, ...dates } : e)),
    }));
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
    const entriesValid = cropEntries.every(
      (e) => e.crop.trim() !== '' && (e.startDate.trim() !== '' || e.month.trim() !== ''),
    );
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
        cropEntries: cropEntries.map((e) => ({
          ...e,
          month: e.month || (e.startDate ? e.startDate.slice(0, 7) : ''),
          startDate: e.startDate || '',
          endDate: e.endDate || '',
        })),
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
      back();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to delete field.');
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

  async function saveHistoryRecords(nextHistory: PlantingRecord[]) {
    try {
      applyFieldUpdate(await updateFieldApi(selectedFieldId, { history: nextHistory }));
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to save planting history.');
    }
  }

  function addHistoryRecord(record: PlantingRecord) {
    const field = fields.find((f) => f.id === selectedFieldId);
    if (!field) return;
    void saveHistoryRecords([record, ...field.history]);
  }

  function editHistoryRecord(index: number, record: PlantingRecord) {
    const field = fields.find((f) => f.id === selectedFieldId);
    if (!field) return;
    void saveHistoryRecords(field.history.map((r, i) => (i === index ? record : r)));
  }

  function buildScanResult(result: ApiIdentifyResult): ScanResult {
    return {
      isPlant: result.isPlant,
      species: result.species,
      isWeed: result.isWeed,
      actionTier: result.actionTier,
      tagLabel: result.isPlant ? (result.isWeed ? 'Weed' : 'Crop') : null,
      tagBg: result.isWeed ? palette.rotate.bg : palette.safe.bg,
      tagText: result.isWeed ? palette.rotate.text : palette.safe.text,
      reason: result.reason,
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
    setCapturedImage(imageBase64);
    runIdentify({ imageBase64 });
  }

  function handleSubmitText() {
    if (!textQuery.trim()) return;
    runIdentify({ description: textQuery.trim() });
  }

  const shellMaxWidth = 760;

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        background: '#E7E4DA',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: shellMaxWidth,
          height: '100dvh',
          background: palette.bg,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {!authed ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: 24,
              textAlign: 'center',
            }}
          >
            {autoLoginError ? (
              <div style={{ color: palette.rotate.bg, fontSize: 13.5, fontWeight: 600 }}>{autoLoginError}</div>
            ) : (
              <div style={{ color: palette.muted, fontSize: 13.5 }}>Loading…</div>
            )}
          </div>
        ) : screen === 'intro' ? (
          <IntroScreen palette={palette} userName={userName} onContinue={finishIntro} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%' }}>
            <Header palette={palette} eyebrow={header.eyebrow} title={header.title} showBack={showBack} onBack={back} />

            <div
              style={{
                flex: 1,
                overflowY: screen === 'farmMap' || screen === 'dashboard' ? 'hidden' : 'auto',
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
                  editTarget={editTarget}
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
                  onStartEditFarmBoundary={startEditFarmBoundary}
                  onStartEditSubplot={startEditSubplot}
                  onFinishEditing={finishEditing}
                  onEditFarmBoundary={handleEditFarmBoundary}
                  onEditSubplot={handleEditSubplotShape}
                />
              )}

              {screen === 'dashboard' && (
                <FieldsPage
                  palette={palette}
                  farm={farm}
                  onUpdateSubplotData={handleUpdateSubplotData}
                  focusSubplotId={focusSubplotId}
                  onFocusSubplotConsumed={() => setFocusSubplotId(null)}
                  onOpenFarmMap={() => {
                    setDrawMode(farm.farmPolygon ? 'idle' : 'farm');
                    setScreen('farmMap');
                  }}
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
                  onEditHistoryRecord={editHistoryRecord}
                />
              )}

              {screen === 'camera' && (
                <IdentifyScreen
                  palette={palette}
                  inputMode={inputMode}
                  onSetPhotoMode={() => {
                    setInputMode('photo');
                    setCaptured(false);
                    setCapturedImage(null);
                    setTextQuery('');
                  }}
                  onSetTextMode={() => {
                    setInputMode('text');
                    setCaptured(false);
                    setCapturedImage(null);
                  }}
                  captured={captured}
                  capturedImage={capturedImage}
                  onCapture={handleCapture}
                  onRetake={() => {
                    setCaptured(false);
                    setCapturedImage(null);
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
                  farm={farm}
                  onOpenFarmMap={() => {
                    setDrawMode(farm.farmPolygon ? 'idle' : 'farm');
                    setScreen('farmMap');
                  }}
                  onOpenSubplot={(id) => {
                    setFocusSubplotId(id);
                    setScreen('dashboard');
                  }}
                  onRecommendationsUpdate={(id, rec) => {
                    setFarm((f) => ({
                      ...f,
                      subplots: f.subplots.map((s) =>
                        s.id === id ? { ...s, data: { ...s.data, recommendations: rec } } : s,
                      ),
                    }));
                  }}
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
                  onChangeCropEntryDates={onChangeCropEntryDates}
                  onSetCurrentEntry={onSetCurrentEntry}
                  onSave={saveAddField}
                  onCancel={() => setScreen('dashboard')}
                />
              )}

              {screen === 'profile' && (
                <ProfileScreen
                  palette={palette}
                  profile={profile}
                  username={userName}
                  accountSaving={accountSaving}
                  accountError={accountError}
                  onChangeField={(field, value) => setProfile((s) => ({ ...s, [field]: value }))}
                  onUpdateAccount={updateAccount}
                  onSignOut={signOut}
                />
              )}
            </div>

            <BottomNav palette={palette} activeTab={activeTab} onNavigate={setScreen} />
          </div>
        )}
      </div>
    </div>
  );
}
