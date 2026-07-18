import { useEffect, useMemo, useState } from 'react';
import type {
  AddFieldForm,
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
import {
  addField as addFieldApi,
  clearFieldCrop,
  deleteField as deleteFieldApi,
  fetchFields,
  fetchReference,
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
import AddFieldScreen from './screens/AddFieldScreen';
import RecommendationScreen from './screens/CropRecommendationScreen';
import ProfileScreen from './screens/ProfileScreen';

const HEADER_MAP: Record<Exclude<Screen, 'detail'>, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: 'Field Intelligence', title: 'Your Fields' },
  camera: { eyebrow: 'Field Intelligence', title: 'Identify' },
  recommendation: { eyebrow: 'Field Intelligence', title: 'Recommendation' },
  profile: { eyebrow: 'Field Intelligence', title: 'Profile' },
  addField: { eyebrow: 'Field Intelligence', title: 'Add Field' },
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

  const [addForm, setAddForm] = useState<AddFieldForm>(EMPTY_ADD_FIELD_FORM);
  const [addFieldSaving, setAddFieldSaving] = useState(false);
  const [addFieldError, setAddFieldError] = useState<string | null>(null);

  const [referenceCrops, setReferenceCrops] = useState<string[]>([]);
  const [referenceSoilTypes, setReferenceSoilTypes] = useState<string[]>([]);

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

  const activeTab = (screen === 'detail' ? 'dashboard' : screen === 'addField' ? 'dashboard' : screen) as
    | 'dashboard'
    | 'camera'
    | 'recommendation'
    | 'profile';
  const showBack = screen === 'detail' || screen === 'addField' || (screen === 'camera' && captured);
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
                  onAddField={() => {
                    setAddForm(EMPTY_ADD_FIELD_FORM);
                    setAddFieldError(null);
                    setScreen('addField');
                  }}
                />
              )}

              {screen === 'detail' && (
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
