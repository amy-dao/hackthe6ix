import { useEffect, useMemo, useState } from 'react';
import type {
  AddCropForm,
  ColorMode,
  CropRotationRecommendation,
  DashboardView,
  Field,
  InputMode,
  LoginForm,
  Profile,
  Screen,
  StatusFilter,
} from './types';
import { palettes } from './palette';
import { CROP_OPTIONS } from './seedData';
import { formatDateLabel } from './lib/fieldHelpers';
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
import DashboardScreen from './screens/DashboardScreen';
import FieldDetailScreen from './screens/FieldDetailScreen';
import IdentifyScreen, { type ScanResult } from './screens/IdentifyScreen';
import AddCropScreen from './screens/AddCropScreen';
import RecommendationScreen from './screens/CropRecommendationScreen';
import ProfileScreen from './screens/ProfileScreen';

const HEADER_MAP: Record<Exclude<Screen, 'detail'>, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: 'Field Intelligence', title: 'Your Fields' },
  camera: { eyebrow: 'Field Intelligence', title: 'Identify' },
  recommendation: { eyebrow: 'Field Intelligence', title: 'Recommendation' },
  profile: { eyebrow: 'Field Intelligence', title: 'Profile' },
  addCrop: { eyebrow: 'Field Intelligence', title: 'Add Crop' },
};

export default function App() {
  const [colorMode, setColorMode] = useState<ColorMode>('traffic-light');
  const [authed, setAuthed] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [screen, setScreen] = useState<Screen>('dashboard');
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

  const [recommendation, setRecommendation] = useState<CropRotationRecommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

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
    name: 'Jordan Hale',
    farmName: 'Hale Family Farm',
    location: 'Cedar County, IA',
    acres: '183',
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

  const activeTab = (screen === 'detail' ? 'dashboard' : screen === 'addCrop' ? 'dashboard' : screen) as
    | 'dashboard'
    | 'camera'
    | 'recommendation'
    | 'profile';
  const showBack = screen === 'detail' || screen === 'addCrop' || (screen === 'camera' && captured);
  const header =
    screen === 'detail'
      ? { eyebrow: `${selectedField.crop} · ${selectedField.acres} ac`, title: selectedField.name }
      : HEADER_MAP[screen];

  function signIn() {
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setLoginError('Enter your email and password to continue.');
      return;
    }
    setAuthed(true);
    setLoginError('');
    setScreen('dashboard');
  }

  function signOut() {
    setAuthed(false);
    setLoginForm({ email: '', password: '' });
    setLoginError('');
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
          maxWidth: 480,
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
            onChangeEmail={(email) => setLoginForm((s) => ({ ...s, email }))}
            onChangePassword={(password) => setLoginForm((s) => ({ ...s, password }))}
            onSignIn={signIn}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%' }}>
            <Header palette={palette} eyebrow={header.eyebrow} title={header.title} showBack={showBack} onBack={back} />

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 16px' }}>
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
                />
              )}

              {screen === 'detail' && (
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

              {screen === 'recommendation' && (
                <RecommendationScreen
                  palette={palette}
                  recommendation={recommendation}
                  loading={recommendationLoading}
                  error={recommendationError}
                  onRetry={fetchRecommendation}
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
