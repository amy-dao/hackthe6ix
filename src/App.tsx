import { useMemo, useState } from 'react';
import type {
  AddCropForm,
  ColorMode,
  DashboardView,
  Field,
  InputMode,
  LoginForm,
  Profile,
  Screen,
  StatusFilter,
} from './types';
import { palettes } from './palette';
import { CROP_OPTIONS, SEED_FIELDS } from './seedData';
import { emptyField, formatDateLabel, plantedField } from './lib/fieldHelpers';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import MapPopup from './components/MapPopup';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import FieldDetailScreen from './screens/FieldDetailScreen';
import IdentifyScreen, { type ScanResult } from './screens/IdentifyScreen';
import AddCropScreen from './screens/AddCropScreen';
import ProfileScreen from './screens/ProfileScreen';

const HEADER_MAP: Record<Exclude<Screen, 'detail'>, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: 'Field Intelligence', title: 'Your Fields' },
  camera: { eyebrow: 'Field Intelligence', title: 'Identify' },
  profile: { eyebrow: 'Field Intelligence', title: 'Profile' },
  addCrop: { eyebrow: 'Field Intelligence', title: 'Add Crop' },
};

export default function App() {
  const [colorMode, setColorMode] = useState<ColorMode>('traffic-light');
  const [authed, setAuthed] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [screen, setScreen] = useState<Screen>('dashboard');
  const [selectedFieldId, setSelectedFieldId] = useState(1);
  const [fields, setFields] = useState<Field[]>(() => JSON.parse(JSON.stringify(SEED_FIELDS)));

  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingCrop, setEditingCrop] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | false>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dashboardView, setDashboardView] = useState<DashboardView>('cards');
  const [mapPopupFieldId, setMapPopupFieldId] = useState<number | null>(null);

  const [addForm, setAddForm] = useState<AddCropForm>({ cropName: '', photoAdded: false, date: '', plotName: '' });

  const [inputMode, setInputMode] = useState<InputMode>('photo');
  const [captured, setCaptured] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [textQuery, setTextQuery] = useState('');

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

  const isPhotoMode = inputMode === 'photo';
  const scanResult: ScanResult = isPhotoMode
    ? {
        species: 'Common Ragweed',
        isWeed: true,
        tagLabel: 'Weed',
        tagBg: palette.rotate.bg,
        tagText: palette.rotate.text,
        reason: 'Leaf shape and venation pattern match ragweed, not the planted corn crop.',
        confidence: '94%',
      }
    : {
        species: 'Common Ragweed',
        isWeed: true,
        tagLabel: 'Weed',
        tagBg: palette.rotate.bg,
        tagText: palette.rotate.text,
        reason: `Your description ("${textQuery.slice(0, 60)}") matches ragweed's typical stem and leaf pattern.`,
        confidence: '81%',
      };

  const activeTab = (screen === 'detail' ? 'dashboard' : screen === 'addCrop' ? 'dashboard' : screen) as
    | 'dashboard'
    | 'camera'
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

  function selectField(id: number) {
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

  function toggleSelect(id: number) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function clearSelected() {
    if (!selectedIds.length) return;
    setFields((fs) => fs.map((f) => (selectedIds.includes(f.id) ? emptyField(f) : f)));
    setSelectedIds([]);
  }

  function saveAddCrop() {
    const { cropName, date, plotName } = addForm;
    if (!cropName.trim() || !plotName.trim()) return;
    const dateLabel = date ? formatDateLabel(date) : 'today';
    setFields((fs) => {
      const idx = fs.findIndex((f) => f.name.toLowerCase() === plotName.trim().toLowerCase());
      if (idx >= 0) {
        const next = [...fs];
        next[idx] = plantedField(next[idx], cropName.trim(), dateLabel);
        return next;
      }
      const newField: Field = plantedField(
        {
          id: Math.max(0, ...fs.map((f) => f.id)) + 1,
          name: plotName.trim(),
          acres: '—',
          crop: cropName.trim(),
          status: 'safe',
          risk: 0,
          reason: '',
          confidence: 'High',
          lastScan: '',
          suggestedCrops: [],
          durationLabel: '',
          durationRange: '',
        },
        cropName.trim(),
        dateLabel,
      );
      return [...fs, newField];
    });
    setScreen('dashboard');
  }

  function clearCropInDetail() {
    setFields((fs) => fs.map((f) => (f.id === selectedFieldId ? emptyField(f) : f)));
    setEditingCrop(false);
  }

  function setCrop(cropName: string) {
    setFields((fs) => fs.map((f) => (f.id === selectedFieldId ? plantedField(f, cropName) : f)));
    setEditingCrop(false);
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
              {screen === 'dashboard' && (
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
                  onCapture={() => setCaptured(true)}
                  onRetake={() => {
                    setCaptured(false);
                    setFlagged(false);
                    setTextQuery('');
                  }}
                  textQuery={textQuery}
                  onChangeTextQuery={setTextQuery}
                  onSubmitText={() => {
                    if (textQuery.trim()) setCaptured(true);
                  }}
                  scanResult={scanResult}
                  flagged={flagged}
                  onToggleFlag={() => setFlagged((v) => !v)}
                />
              )}

              {screen === 'addCrop' && (
                <AddCropScreen
                  palette={palette}
                  form={addForm}
                  plotNames={plotNames}
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
