import { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  Camera,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Footprints,
  Images,
  Lock,
  Move,
  MousePointer,
  Plus,
  RotateCw,
  Ruler,
  Maximize2,
  Sliders,
  Trash2,
  Unlock,
  MapPin,
} from 'lucide-react';
import { computeDistanceCm, type WalkKeysState } from '../scene/layoutMath';
import { CATALOG_TEMPLATES, REFERENCE_PHOTOS } from '../scene/presets';
import type {
  BracketStyle,
  CameraPresetId,
  CatalogTemplate,
  DockTab,
  FinishPreset,
  FloorStyle,
  Lang,
  Measurement,
  NavMode,
  PerimeterWallsState,
  Point3D,
  RoomConfig,
  SceneItem,
  ToolMode,
  WallStyle,
} from '../scene/types';

interface BottomControlDockProps {
  lang: Lang;
  collapsed: boolean;
  activeTab: DockTab;
  navMode: NavMode;
  toolMode: ToolMode;
  gridSnapCm: number;
  room: RoomConfig;
  items: SceneItem[];
  selectedItem: SceneItem | null;
  pendingPlaceTemplate: CatalogTemplate | null;
  measurements: Measurement[];
  pendingMeasureStart: Point3D | null;
  walkPadRef: React.MutableRefObject<WalkKeysState>;
  onToggleCollapse: () => void;
  onChangeTab: (tab: DockTab) => void;
  onChangeNavMode: (mode: NavMode) => void;
  onChangeToolMode: (mode: ToolMode) => void;
  onChangeGridSnap: (snapCm: number) => void;
  onSelectCameraPreset: (preset: CameraPresetId) => void;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (item: SceneItem, recordHistory?: boolean) => void;
  onDuplicateItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateRoom: (room: RoomConfig | ((prev: RoomConfig) => RoomConfig), recordHistory?: boolean) => void;
  onApplyLayoutPreset: (preset: 'stainless' | 'legacy') => void;
  onStartPlaceTemplate: (tpl: CatalogTemplate) => void;
  onDropTemplateCenter: (tpl: CatalogTemplate) => void;
  onCancelPlace: () => void;
  onClearMeasurements: () => void;
  onOpenPhoto: (index: number) => void;
}

const FINISH_OPTIONS: { id: FinishPreset; labelAr: string; labelEn: string; swatch: string }[] = [
  { id: 'original', labelAr: 'الأصلي', labelEn: 'Original', swatch: '#8b6f4e' },
  { id: 'matte_black', labelAr: 'أسود مطفي', labelEn: 'Matte Black', swatch: '#1b1d22' },
  { id: 'warm_oak', labelAr: 'خشب بلوط', labelEn: 'Warm Oak', swatch: '#c9883b' },
  { id: 'stainless', labelAr: 'ستانلس', labelEn: 'Stainless', swatch: '#cbd5e1' },
  { id: 'white_marble', labelAr: 'أبيض رخامي', labelEn: 'White', swatch: '#f1f0eb' },
  { id: 'charcoal', labelAr: 'فحمي', labelEn: 'Charcoal', swatch: '#3b424d' },
];

const WALL_STYLES: { id: WallStyle; labelAr: string; labelEn: string; swatch: string }[] = [
  { id: 'subway_white', labelAr: 'بلاط أبيض بارز', labelEn: 'White Subway', swatch: '#ebe6dc' },
  { id: 'matte_cream', labelAr: 'كريمي مطفي', labelEn: 'Matte Cream', swatch: '#f1ebe0' },
  { id: 'warm_concrete', labelAr: 'خرسانة دافئة', labelEn: 'Concrete', swatch: '#b8b2a8' },
  { id: 'dark_slate', labelAr: 'رمادي داكن', labelEn: 'Dark Slate', swatch: '#30363f' },
  { id: 'terracotta_brick', labelAr: 'طوب حراري', labelEn: 'Red Brick', swatch: '#9c4c38' },
];

const FLOOR_STYLES: { id: FloorStyle; labelAr: string; labelEn: string; swatch: string }[] = [
  { id: 'cream_ceramic', labelAr: 'سيراميك كريمي', labelEn: 'Cream Tile', swatch: '#dfd9cf' },
  { id: 'light_porcelain', labelAr: 'بورسلين فاتح', labelEn: 'Porcelain', swatch: '#cfd4da' },
  { id: 'oak_plank', labelAr: 'باركيه خشب', labelEn: 'Oak Wood', swatch: '#c9883b' },
  { id: 'terrazzo', labelAr: 'تيرازو', labelEn: 'Terrazzo', swatch: '#dcd6cc' },
  { id: 'charcoal_tile', labelAr: 'بلاط فحمي', labelEn: 'Charcoal Tile', swatch: '#2f3540' },
];

const CAMERA_PRESETS: { id: CameraPresetId; labelAr: string; labelEn: string }[] = [
  { id: 'entrance', labelAr: 'منظر المدخل', labelEn: 'Entrance' },
  { id: 'front_wall', labelAr: 'باب الدخول', labelEn: 'Front Door' },
  { id: 'back_wall', labelAr: 'التكييف والحمام', labelEn: 'Back Wall & AC' },
  { id: 'topdown', labelAr: 'مسقط علوي', labelEn: 'Top-Down' },
  { id: 'left_wall', labelAr: 'الجدار الشمال', labelEn: 'Left Wall' },
  { id: 'right_wall', labelAr: 'الجدار اليمين', labelEn: 'Right Wall' },
  { id: 'corner_iso', labelAr: 'منظور كامل', labelEn: '3D Corner' },
];

const WALL_TOGGLES: { key: keyof PerimeterWallsState; labelAr: string; labelEn: string }[] = [
  { key: 'north', labelAr: 'الخلفي (الباب)', labelEn: 'Back Wall' },
  { key: 'south', labelAr: 'الأمامي (المدخل)', labelEn: 'Front Wall' },
  { key: 'west', labelAr: 'الشمال (الثلاجة)', labelEn: 'Left Wall' },
  { key: 'east', labelAr: 'اليمين (البار)', labelEn: 'Right Wall' },
  { key: 'pillar', labelAr: 'عمود الزاوية', labelEn: 'Corner Pillar' },
];

const BRACKET_OPTIONS: {
  id: BracketStyle;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
}[] = [
  {
    id: 'gusset_plate',
    labelAr: 'مثلث مصمت (شطاف)',
    labelEn: 'Solid Gusset',
    descAr: 'صاج استالس مصمت للتحمل الثقيل',
    descEn: 'Heavy-duty welded steel plate',
  },
  {
    id: 'curved_arch',
    labelAr: 'كابولي مقوّس',
    labelEn: 'Curved Arch',
    descAr: 'قوس انسيابي مودرن تحت الرف',
    descEn: 'Sleek concave cafe bracket',
  },
  {
    id: 'diagonal_tube',
    labelAr: 'تيوب بدعامة مائلة',
    labelEn: 'Tubular Brace',
    descAr: 'زاوية تيوب مربع بدعامة داخلية',
    descEn: 'Square tube frame + brace',
  },
  {
    id: 'hidden_rod',
    labelAr: 'مخفي (رف طاير)',
    labelEn: 'Hidden Floating',
    descAr: 'مجرى خلفي مخفي بدون حوامل بارزة',
    descEn: 'Flush rear ledger & hidden pins',
  },
];

function BracketIcon({ styleId }: { styleId: BracketStyle }) {
  return (
    <svg viewBox="0 0 28 24" className="w-6 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
      {/* Shelf top line */}
      <line x1="2" y1="4" x2="26" y2="4" strokeWidth="2.4" />
      {styleId === 'gusset_plate' && (
        <polygon points="4,5 23,5 7,21 4,21" fill="currentColor" fillOpacity="0.32" />
      )}
      {styleId === 'curved_arch' && (
        <path d="M4 5 H23 Q11 8 7 21 H4 Z" fill="currentColor" fillOpacity="0.32" />
      )}
      {styleId === 'diagonal_tube' && (
        <>
          <line x1="5" y1="5" x2="5" y2="21" strokeWidth="2.2" />
          <line x1="5" y1="6" x2="23" y2="6" strokeWidth="2.2" />
          <line x1="5" y1="19" x2="19" y2="6" strokeWidth="2" />
        </>
      )}
      {styleId === 'hidden_rod' && (
        <>
          <rect x="3" y="5" width="4" height="5" fill="currentColor" fillOpacity="0.55" stroke="none" />
          <line x1="7" y1="7" x2="18" y2="7" strokeDasharray="2 2" strokeWidth="1.6" />
        </>
      )}
    </svg>
  );
}

export function BottomControlDock({
  lang,
  collapsed,
  activeTab,
  navMode,
  toolMode,
  gridSnapCm,
  room,
  items,
  selectedItem,
  pendingPlaceTemplate,
  measurements,
  pendingMeasureStart,
  walkPadRef,
  onToggleCollapse,
  onChangeTab,
  onChangeNavMode,
  onChangeToolMode,
  onChangeGridSnap,
  onSelectCameraPreset,
  onSelectItem,
  onUpdateItem,
  onDuplicateItem,
  onDeleteItem,
  onUpdateRoom,
  onApplyLayoutPreset,
  onStartPlaceTemplate,
  onDropTemplateCenter,
  onCancelPlace,
  onClearMeasurements,
  onOpenPhoto,
}: BottomControlDockProps) {
  const isAr = lang === 'ar';
  const [showBracketsMenu, setShowBracketsMenu] = useState(false);

  const setWalkKey = (key: keyof WalkKeysState, active: boolean) => {
    walkPadRef.current[key] = active;
  };

  const tabs: { id: DockTab; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { id: 'nav', labelAr: 'الحركة والكاميرا', labelEn: 'Navigate', icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'edit', labelAr: 'تعديل عنصر', labelEn: 'Edit Item', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'room', labelAr: 'الأبعاد والجدران', labelEn: 'Room & Walls', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'add', labelAr: 'إضافة جدران وأثاث', labelEn: 'Add Objects', icon: <Plus className="w-3.5 h-3.5" /> },
    { id: 'measure', labelAr: 'قياس المسافات', labelEn: 'Measure', icon: <Ruler className="w-3.5 h-3.5" /> },
    { id: 'photos', labelAr: 'صور المكان', labelEn: 'Photos', icon: <Images className="w-3.5 h-3.5" /> },
  ];

  const walls = room.walls ?? { north: true, south: true, west: true, east: true, pillar: true };
  const activeBracketStyle: BracketStyle = room.bracketStyle ?? 'gusset_plate';
  const activeBracket = BRACKET_OPTIONS.find((b) => b.id === activeBracketStyle) ?? BRACKET_OPTIONS[0];

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-[min(960px,95vw)] pointer-events-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Collapse / Expand Toggle Handle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? (isAr ? 'إظهار لوحة التحكم' : 'Show Controls') : (isAr ? 'إخفاء لوحة التحكم' : 'Hide Controls')}
        className="pointer-events-auto mb-1.5 px-3.5 py-1 rounded-t-xl rounded-b-md bg-[#12151ce8] border border-white/12 text-xs font-medium text-stone-200 hover:text-amber-300 flex items-center gap-1.5 shadow-md transition-colors whitespace-nowrap"
      >
        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>
          {collapsed
            ? isAr
              ? 'إظهار التحكم (H)'
              : 'Show Controls (H)'
            : isAr
            ? 'إخفاء اللوحة (H)'
            : 'Hide Controls (H)'}
        </span>
      </button>

      {!collapsed && (
        <div className="pointer-events-auto w-full rounded-2xl bg-[#12151cf2] border border-white/12 shadow-2xl overflow-hidden">
          {/* Tab Switcher Row */}
          <div className="flex items-center gap-1 px-2.5 pt-2 pb-1.5 border-b border-white/10 overflow-x-auto thin-scroll">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeTab(tab.id)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-amber-500 text-stone-950 font-semibold'
                      : 'text-stone-300 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Content */}
          <div className="p-3 text-xs text-stone-200">
            {/* TAB 1: NAVIGATION & CAMERA */}
            {activeTab === 'nav' && (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-black/35 border border-white/8">
                    <button
                      type="button"
                      onClick={() => onChangeNavMode('orbit')}
                      className={`h-8 px-3 rounded-md font-medium flex items-center gap-1.5 whitespace-nowrap ${
                        navMode === 'orbit' ? 'bg-amber-500 text-stone-950 font-semibold' : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      <MousePointer className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تدوير ومعاينة' : 'Orbit View'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeNavMode('walk')}
                      className={`h-8 px-3 rounded-md font-medium flex items-center gap-1.5 whitespace-nowrap ${
                        navMode === 'walk' ? 'bg-amber-500 text-stone-950 font-semibold' : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      <Footprints className="w-3.5 h-3.5" />
                      <span>{isAr ? 'مشي بالداخل (WASD)' : 'Walk Inside (WASD)'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateRoom((prev) => ({ ...prev, hideAllWalls: !prev.hideAllWalls }), false)}
                      className={`h-8 px-2.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
                        room.hideAllWalls
                          ? 'bg-red-500/20 border-red-400/55 text-red-200 font-semibold'
                          : 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      {room.hideAllWalls
                        ? isAr
                          ? 'إظهار الجدران'
                          : 'Show All Walls'
                        : isAr
                        ? 'إخفاء كل الجدران'
                        : 'Hide All Walls'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRoom(
                          (prev) => ({ ...prev, showShelfProps: !(prev.showShelfProps ?? true) }),
                          false
                        )
                      }
                      className={`h-8 px-2.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
                        !(room.showShelfProps ?? true)
                          ? 'bg-emerald-500/20 border-emerald-400/55 text-emerald-200 font-semibold'
                          : 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      {!(room.showShelfProps ?? true)
                        ? isAr
                          ? 'إظهار العلب والقزايز'
                          : 'Show Jars & Props'
                        : isAr
                        ? 'إخفاء العلب والقزايز'
                        : 'Hide Jars & Props'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRoom((prev) => ({ ...prev, cadMode: !prev.cadMode }), false)}
                      className={`h-8 px-2.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
                        room.cadMode
                          ? 'bg-sky-500/25 border-sky-400/60 text-sky-200 font-semibold'
                          : 'bg-amber-500/20 border-amber-400/50 text-amber-300 font-semibold hover:bg-amber-500/30'
                      }`}
                    >
                      {room.cadMode
                        ? isAr
                          ? 'وضع أوتوكاد CAD (مخطط)'
                          : 'AutoCAD CAD View'
                        : isAr
                        ? '✨ رندر ثلاثي الأبعاد واقعي'
                        : '✨ Realistic 3D Render'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRoom((prev) => ({ ...prev, cutawayWalls: !prev.cutawayWalls }), false)}
                      className={`h-8 px-2.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
                        room.cutawayWalls
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-white/5 border-white/10 text-stone-300'
                      }`}
                    >
                      {isAr ? 'إخفاء الجدران القريبة' : 'Auto Cutaway Walls'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRoom((prev) => ({ ...prev, showDimensions: !prev.showDimensions }), false)
                      }
                      className={`h-8 px-2.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
                        room.showDimensions
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-white/5 border-white/10 text-stone-300'
                      }`}
                    >
                      {isAr ? 'خطوط المقاسات' : 'Dimensions'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRoom(
                          (prev) => ({
                            ...prev,
                            lightingMode:
                              (prev.lightingMode ?? 'warm_3000k') === 'warm_3000k'
                                ? 'neutral_5000k'
                                : 'warm_3000k',
                          }),
                          false
                        )
                      }
                      className={`h-8 px-2.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
                        (room.lightingMode ?? 'warm_3000k') === 'warm_3000k'
                          ? 'bg-amber-500/20 border-amber-400/55 text-amber-200 font-semibold'
                          : 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      {(room.lightingMode ?? 'warm_3000k') === 'warm_3000k'
                        ? isAr
                          ? 'إضاءة دافئة 3000K'
                          : 'Warm 3000K'
                        : isAr
                        ? 'إضاءة محايدة 5000K'
                        : 'Neutral 5000K'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBracketsMenu((v) => !v)}
                      aria-expanded={showBracketsMenu}
                      className={`h-8 px-2.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                        showBracketsMenu
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                          : 'bg-sky-500/15 border-sky-400/40 text-sky-200 hover:bg-sky-500/25'
                      }`}
                    >
                      <BracketIcon styleId={activeBracketStyle} />
                      <span>
                        {isAr ? `أشكال الحوامل: ${activeBracket.labelAr}` : `Brackets: ${activeBracket.labelEn}`}
                      </span>
                    </button>
                  </div>
                </div>

                {showBracketsMenu && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-black/35 rounded-xl p-2 border border-white/10">
                    {BRACKET_OPTIONS.map((opt) => {
                      const active = activeBracketStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            onUpdateRoom((prev) => ({ ...prev, bracketStyle: opt.id }), true)
                          }
                          className={`flex items-center gap-2 p-2 rounded-lg border text-start transition-colors ${
                            active
                              ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                              : 'bg-white/5 border-white/8 text-stone-300 hover:bg-white/10'
                          }`}
                        >
                          <BracketIcon styleId={opt.id} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">
                              {isAr ? opt.labelAr : opt.labelEn}
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">
                              {isAr ? opt.descAr : opt.descEn}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {navMode === 'orbit' ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll pb-0.5">
                    <span className="text-stone-400 whitespace-nowrap shrink-0 me-1">
                      {isAr ? 'زوايا سريعة:' : 'Presets:'}
                    </span>
                    {CAMERA_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectCameraPreset(p.id)}
                        className="h-8 px-3 rounded-lg bg-white/6 hover:bg-white/14 border border-white/8 text-stone-100 whitespace-nowrap shrink-0 transition-colors"
                      >
                        {isAr ? p.labelAr : p.labelEn}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-black/25 rounded-xl px-3 py-2 border border-white/8">
                    <span className="text-stone-300">
                      {isAr
                        ? 'اسحب الماوس للالتفات · استخدم W A S D أو الأسهم للحركة'
                        : 'Drag to look around · Use W A S D or buttons to walk inside'}
                    </span>
                    <div className="flex items-center gap-1" dir="ltr">
                      <button
                        type="button"
                        aria-label="Walk Left"
                        onPointerDown={() => setWalkKey('left', true)}
                        onPointerUp={() => setWalkKey('left', false)}
                        onPointerLeave={() => setWalkKey('left', false)}
                        className="w-9 h-8 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-black flex items-center justify-center"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Walk Forward"
                        onPointerDown={() => setWalkKey('forward', true)}
                        onPointerUp={() => setWalkKey('forward', false)}
                        onPointerLeave={() => setWalkKey('forward', false)}
                        className="w-9 h-8 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-black flex items-center justify-center"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Walk Backward"
                        onPointerDown={() => setWalkKey('backward', true)}
                        onPointerUp={() => setWalkKey('backward', false)}
                        onPointerLeave={() => setWalkKey('backward', false)}
                        className="w-9 h-8 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-black flex items-center justify-center"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Walk Right"
                        onPointerDown={() => setWalkKey('right', true)}
                        onPointerUp={() => setWalkKey('right', false)}
                        onPointerLeave={() => setWalkKey('right', false)}
                        className="w-9 h-8 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-black flex items-center justify-center"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: EDIT ITEM STEP BY STEP */}
            {activeTab === 'edit' && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll pb-1">
                  {items.map((item) => {
                    const isSel = selectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectItem(item.id)}
                        className={`h-7 px-2.5 rounded-md border text-xs whitespace-nowrap shrink-0 transition-colors ${
                          isSel
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                            : 'bg-white/5 border-white/8 text-stone-300 hover:bg-white/10'
                        } ${!item.visible ? 'opacity-45 line-through' : ''}`}
                      >
                        {isAr ? item.nameAr : item.nameEn}
                      </button>
                    );
                  })}
                </div>

                {selectedItem ? (
                  <div className="flex flex-col gap-2.5 bg-black/25 rounded-xl p-2.5 border border-white/8">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { id: 'select' as ToolMode, ar: 'تحديد', en: 'Select', icon: <MousePointer className="w-3.5 h-3.5" /> },
                          { id: 'translate' as ToolMode, ar: 'تحريك (G)', en: 'Move (G)', icon: <Move className="w-3.5 h-3.5" /> },
                          { id: 'rotate' as ToolMode, ar: 'تدوير (R)', en: 'Rotate (R)', icon: <RotateCw className="w-3.5 h-3.5" /> },
                          { id: 'scale' as ToolMode, ar: 'مقاس (S)', en: 'Scale (S)', icon: <Maximize2 className="w-3.5 h-3.5" /> },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onChangeToolMode(m.id)}
                            className={`h-7 px-2.5 rounded-md flex items-center gap-1 whitespace-nowrap ${
                              toolMode === m.id
                                ? 'bg-amber-500 text-stone-950 font-semibold'
                                : 'bg-white/8 text-stone-200 hover:bg-white/15'
                            }`}
                          >
                            {m.icon}
                            <span>{isAr ? m.ar : m.en}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={selectedItem.locked}
                          onClick={() =>
                            onUpdateItem(
                              { ...selectedItem, rotYDeg: (selectedItem.rotYDeg + 90) % 360 },
                              true
                            )
                          }
                          className="h-7 px-2 rounded-md bg-white/8 hover:bg-white/15 text-amber-300 font-mono-nums disabled:opacity-40 whitespace-nowrap"
                          title={isAr ? 'تدوير 90 درجة' : 'Rotate 90°'}
                        >
                          +90°
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="flex items-center gap-1 text-stone-400">
                          <span>{isAr ? 'شبكة:' : 'Snap:'}</span>
                          <select
                            value={gridSnapCm}
                            onChange={(e) => onChangeGridSnap(Number(e.target.value))}
                            aria-label={isAr ? 'الالتزام بالشبكة' : 'Grid Snap'}
                            className="h-7 px-1.5 rounded bg-[#1b202b] border border-white/12 text-stone-100 font-mono-nums"
                          >
                            <option value={1}>1 cm</option>
                            <option value={5}>5 cm</option>
                            <option value={10}>10 cm</option>
                            <option value={0}>{isAr ? 'حر' : 'Free'}</option>
                          </select>
                        </label>

                        <button
                          type="button"
                          onClick={() => onUpdateItem({ ...selectedItem, locked: !selectedItem.locked }, true)}
                          aria-label={selectedItem.locked ? 'Unlock item' : 'Lock item'}
                          title={isAr ? 'قفل / فك القفل' : 'Lock / Unlock'}
                          className={`h-7 w-7 rounded flex items-center justify-center border ${
                            selectedItem.locked
                              ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                              : 'bg-white/6 border-white/10 text-stone-300'
                          }`}
                        >
                          {selectedItem.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => onUpdateItem({ ...selectedItem, visible: !selectedItem.visible }, true)}
                          aria-label={selectedItem.visible ? 'Hide item' : 'Show item'}
                          title={isAr ? 'إخفاء / إظهار' : 'Hide / Show'}
                          className="h-7 w-7 rounded bg-white/6 border border-white/10 text-stone-300 hover:text-white flex items-center justify-center"
                        >
                          {selectedItem.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDuplicateItem(selectedItem.id)}
                          aria-label={isAr ? 'نسخ العنصر' : 'Duplicate item'}
                          title={isAr ? 'نسخ' : 'Duplicate'}
                          className="h-7 w-7 rounded bg-white/6 border border-white/10 text-stone-300 hover:text-white flex items-center justify-center"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteItem(selectedItem.id)}
                          aria-label={isAr ? 'حذف العنصر' : 'Delete item'}
                          title={isAr ? 'حذف' : 'Delete'}
                          className="h-7 w-7 rounded bg-red-500/15 border border-red-400/30 text-red-300 hover:bg-red-500/30 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Position, Rotation & Dimension Inputs */}
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-2" dir="ltr">
                      {[
                        { label: 'X (cm)', key: 'xCm' as const, step: 5 },
                        { label: 'Y (cm)', key: 'yCm' as const, step: 5 },
                        { label: 'Z (cm)', key: 'zCm' as const, step: 5 },
                        { label: isAr ? 'دوران°' : 'Rot°', key: 'rotYDeg' as const, step: 15 },
                        { label: isAr ? 'عرض' : 'W (cm)', key: 'widthCm' as const, step: 5 },
                        { label: isAr ? 'عمق' : 'D (cm)', key: 'depthCm' as const, step: 5 },
                        { label: isAr ? 'ارتفاع' : 'H (cm)', key: 'heightCm' as const, step: 5 },
                      ].map((field) => (
                        <label key={field.key} className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-stone-400">{field.label}</span>
                          <input
                            type="number"
                            step={field.step}
                            disabled={selectedItem.locked}
                            value={selectedItem[field.key]}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (!Number.isNaN(val)) {
                                onUpdateItem({ ...selectedItem, [field.key]: val }, true);
                              }
                            }}
                            className="h-7 px-2 rounded bg-[#1b202b] border border-white/12 text-stone-100 font-mono-nums text-xs w-full disabled:opacity-45"
                          />
                        </label>
                      ))}
                    </div>

                    {/* Finish Swatches */}
                    <div className="flex items-center gap-2 overflow-x-auto thin-scroll pt-0.5">
                      <span className="text-stone-400 whitespace-nowrap shrink-0">
                        {isAr ? 'الخامة / اللون:' : 'Finish:'}
                      </span>
                      {FINISH_OPTIONS.map((fin) => {
                        const active = selectedItem.finish === fin.id;
                        return (
                          <button
                            key={fin.id}
                            type="button"
                            onClick={() => onUpdateItem({ ...selectedItem, finish: fin.id }, true)}
                            className={`h-7 px-2.5 rounded-md border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                              active
                                ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                                : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-sm border border-white/25"
                              style={{ backgroundColor: fin.swatch }}
                            />
                            <span>{isAr ? fin.labelAr : fin.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>

                    {(selectedItem.kind === 'stainless_single_shelf' ||
                      selectedItem.kind === 'stainless_shelves' ||
                      selectedItem.kind === 'wall_shelf_left') && (
                      <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll pt-0.5">
                        <span className="text-stone-400 whitespace-nowrap shrink-0">
                          {isAr ? 'شكل الحوامل:' : 'Bracket Shape:'}
                        </span>
                        {BRACKET_OPTIONS.map((opt) => {
                          const active = activeBracketStyle === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                onUpdateRoom((prev) => ({ ...prev, bracketStyle: opt.id }), true)
                              }
                              className={`h-7 px-2.5 rounded-md border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                active
                                  ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                                  : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                              }`}
                            >
                              <BracketIcon styleId={opt.id} />
                              <span>{isAr ? opt.labelAr : opt.labelEn}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-3 text-center text-stone-400 bg-black/20 rounded-xl border border-white/8">
                    {isAr
                      ? 'اضغط على أي قطعة في المشهد ثلاثي الأبعاد أو اخترها من الشريط بالأعلى لتعديل مكانها ومقاساتها.'
                      : 'Click any piece in the 3D scene or pick one above to move, rotate, resize, or restyle it.'}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ROOM DIMENSIONS, WALL REMOVAL & SURFACE MATERIALS */}
            {activeTab === 'room' && (
              <div className="flex flex-col gap-2.5">
                {/* Dimensions with both Sliders + Exact Numeric Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { key: 'widthCm' as const, ar: 'عرض المكان (سم)', en: 'Width (cm)', min: 160, max: 700 },
                    { key: 'depthCm' as const, ar: 'طول المكان (سم)', en: 'Depth (cm)', min: 220, max: 1000 },
                    { key: 'heightCm' as const, ar: 'ارتفاع السقف (سم)', en: 'Height (cm)', min: 220, max: 450 },
                  ].map((dim) => (
                    <div key={dim.key} className="bg-black/25 rounded-xl p-2 border border-white/8">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label htmlFor={`room-num-${dim.key}`} className="text-stone-300 font-medium">
                          {isAr ? dim.ar : dim.en}
                        </label>
                        <input
                          id={`room-num-${dim.key}`}
                          type="number"
                          min={dim.min}
                          max={dim.max}
                          step={5}
                          value={room[dim.key]}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (!Number.isNaN(v)) {
                              onUpdateRoom({ ...room, [dim.key]: Math.min(dim.max, Math.max(dim.min, v)) }, true);
                            }
                          }}
                          className="w-16 h-6 px-1.5 rounded bg-[#1b202b] border border-white/15 text-amber-300 font-mono-nums text-xs text-center"
                        />
                      </div>
                      <input
                        aria-label={isAr ? dim.ar : dim.en}
                        type="range"
                        min={dim.min}
                        max={dim.max}
                        step={5}
                        value={room[dim.key]}
                        onChange={(e) =>
                          onUpdateRoom({ ...room, [dim.key]: Number(e.target.value) }, true)
                        }
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>

                {/* Perimeter Wall Add/Remove Toggles + Layout Version Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-black/20 rounded-xl px-2.5 py-2 border border-white/8">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-stone-400 me-1">
                      {isAr ? 'الجدران الخارجية:' : 'Perimeter Walls:'}
                    </span>
                    {WALL_TOGGLES.map((wt) => {
                      const active = walls[wt.key];
                      return (
                        <button
                          key={wt.key}
                          type="button"
                          onClick={() =>
                            onUpdateRoom(
                              {
                                ...room,
                                walls: { ...walls, [wt.key]: !active },
                              },
                              true
                            )
                          }
                          className={`h-7 px-2.5 rounded-md border text-xs whitespace-nowrap transition-colors ${
                            active
                              ? 'bg-emerald-500/18 border-emerald-400/45 text-emerald-200'
                              : 'bg-red-500/12 border-red-400/35 text-red-300 line-through'
                          }`}
                        >
                          {isAr ? wt.labelAr : wt.labelEn}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onApplyLayoutPreset('stainless')}
                      className={`h-7 px-2.5 rounded-md border font-medium whitespace-nowrap ${
                        room.widthCm === 220 && room.depthCm === 400
                          ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                          : 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      {isAr ? 'تصميم الاستالس (220×400×280)' : 'Stainless (220×400×280)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onApplyLayoutPreset('legacy')}
                      className={`h-7 px-2.5 rounded-md border font-medium whitespace-nowrap ${
                        room.widthCm === 235 && room.depthCm === 460
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      {isAr ? 'الوضع القديم (خشب)' : 'Old Wood Layout'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRoom({ ...room, showCeiling: !room.showCeiling }, true)}
                      className={`h-7 px-2.5 rounded-md border font-medium whitespace-nowrap ${
                        room.showCeiling
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-white/5 border-white/10 text-stone-300'
                      }`}
                    >
                      {room.showCeiling ? (isAr ? 'السقف: ظاهر' : 'Ceiling: On') : isAr ? 'السقف: مخفي' : 'Ceiling: Off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRoom({ ...room, hideAllWalls: !room.hideAllWalls }, false)}
                      className={`h-7 px-2.5 rounded-md border font-medium whitespace-nowrap ${
                        room.hideAllWalls
                          ? 'bg-red-500/20 border-red-400/55 text-red-200'
                          : 'bg-white/5 border-white/10 text-stone-300'
                      }`}
                    >
                      {room.hideAllWalls ? (isAr ? 'إظهار الجدران' : 'Show Walls') : isAr ? 'إخفاء كل الجدران' : 'Hide All Walls'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRoom({ ...room, showShelfProps: !(room.showShelfProps ?? true) }, false)
                      }
                      className={`h-7 px-2.5 rounded-md border font-medium whitespace-nowrap ${
                        !(room.showShelfProps ?? true)
                          ? 'bg-emerald-500/20 border-emerald-400/55 text-emerald-200'
                          : 'bg-white/5 border-white/10 text-stone-300'
                      }`}
                    >
                      {!(room.showShelfProps ?? true)
                        ? isAr
                          ? 'إظهار العلب'
                          : 'Show Jars'
                        : isAr
                        ? 'إخفاء العلب والقزايز'
                        : 'Hide Jars'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRoom({ ...room, cadMode: !room.cadMode }, false)}
                      className={`h-7 px-2.5 rounded-md border font-medium whitespace-nowrap ${
                        room.cadMode
                          ? 'bg-sky-500/25 border-sky-400/60 text-sky-200'
                          : 'bg-white/5 border-white/10 text-stone-300'
                      }`}
                    >
                      {isAr ? 'وضع أوتوكاد CAD' : 'AutoCAD'}
                    </button>
                  </div>
                </div>

                {/* Wall & Floor Surface Material Swatches */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-stone-400 whitespace-nowrap shrink-0 min-w-[78px]">
                      {isAr ? 'خامة الحوائط:' : 'Walls:'}
                    </span>
                    {WALL_STYLES.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onUpdateRoom({ ...room, wallStyle: w.id }, true)}
                        className={`h-7 px-2.5 rounded-md border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          room.wallStyle === w.id
                            ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                            : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-sm border border-white/25" style={{ backgroundColor: w.swatch }} />
                        <span>{isAr ? w.labelAr : w.labelEn}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-stone-400 whitespace-nowrap shrink-0 min-w-[78px]">
                      {isAr ? 'خامة الأرضية:' : 'Floor:'}
                    </span>
                    {FLOOR_STYLES.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onUpdateRoom({ ...room, floorStyle: f.id }, true)}
                        className={`h-7 px-2.5 rounded-md border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          room.floorStyle === f.id
                            ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                            : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-sm border border-white/25" style={{ backgroundColor: f.swatch }} />
                        <span>{isAr ? f.labelAr : f.labelEn}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ADD WALLS, PARTITIONS & FURNITURE */}
            {activeTab === 'add' && (
              <div className="flex flex-col gap-2">
                {pendingPlaceTemplate && toolMode === 'place' && (
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-200">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {isAr
                          ? `اضغط في أي مكان داخل الغرفة لوضع: ${pendingPlaceTemplate.nameAr}`
                          : `Click anywhere on the floor to place: ${pendingPlaceTemplate.nameEn}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDropTemplateCenter(pendingPlaceTemplate)}
                        className="h-6 px-2 rounded bg-amber-500 text-stone-950 font-semibold"
                      >
                        {isAr ? 'ضع في المنتصف' : 'Drop Center'}
                      </button>
                      <button
                        type="button"
                        onClick={onCancelPlace}
                        className="h-6 px-2 rounded bg-white/10 text-stone-200"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 overflow-x-auto thin-scroll pb-1">
                  {CATALOG_TEMPLATES.map((tpl) => {
                    const isPlacing = pendingPlaceTemplate?.kind === tpl.kind && toolMode === 'place';
                    return (
                      <div
                        key={tpl.kind}
                        className={`flex flex-col justify-between gap-1.5 min-w-[152px] p-2.5 rounded-xl border shrink-0 transition-colors ${
                          isPlacing
                            ? 'bg-amber-500/20 border-amber-400'
                            : 'bg-white/6 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-stone-100 whitespace-nowrap">
                            {isAr ? tpl.nameAr : tpl.nameEn}
                          </div>
                          <div className="font-mono-nums text-[11px] text-stone-400">
                            {tpl.widthCm} × {tpl.depthCm} × {tpl.heightCm} cm
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onStartPlaceTemplate(tpl)}
                            className="flex-1 h-7 px-2 rounded-md bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-semibold flex items-center justify-center gap-1 whitespace-nowrap"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>{isAr ? 'وضع بالضغط' : 'Place'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDropTemplateCenter(tpl)}
                            aria-label={isAr ? `إضافة ${tpl.nameAr} في المنتصف` : `Drop ${tpl.nameEn} at center`}
                            title={isAr ? 'إضافة سريعة في المنتصف' : 'Quick drop at center'}
                            className="h-7 w-7 rounded-md bg-white/10 hover:bg-white/20 text-stone-100 flex items-center justify-center shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: TAPE MEASURE */}
            {activeTab === 'measure' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChangeToolMode(toolMode === 'measure' ? 'select' : 'measure')}
                      className={`h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 ${
                        toolMode === 'measure'
                          ? 'bg-amber-500 text-stone-950 font-semibold'
                          : 'bg-white/10 text-stone-200 hover:bg-white/15'
                      }`}
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>
                        {toolMode === 'measure'
                          ? isAr
                            ? 'أداة القياس مفعلة (اضغط نقطتين)'
                            : 'Measuring Active (Click 2 points)'
                          : isAr
                          ? 'تفعيل أداة القياس'
                          : 'Start Measuring'}
                      </span>
                    </button>
                    {pendingMeasureStart && (
                      <span className="text-amber-300">
                        {isAr ? 'اختر النقطة الثانية...' : 'Pick second point...'}
                      </span>
                    )}
                  </div>

                  {measurements.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearMeasurements}
                      className="h-8 px-3 rounded-lg bg-red-500/15 border border-red-400/30 text-red-300 hover:bg-red-500/25"
                    >
                      {isAr ? 'مسح القياسات' : 'Clear All'}
                    </button>
                  )}
                </div>

                {measurements.length > 0 ? (
                  <div className="flex items-center gap-2 overflow-x-auto thin-scroll pb-0.5">
                    {measurements.map((m, idx) => {
                      const d = computeDistanceCm(m.startCm, m.endCm);
                      return (
                        <div
                          key={m.id}
                          className="px-3 py-1.5 rounded-lg bg-black/35 border border-white/10 font-mono-nums whitespace-nowrap shrink-0"
                        >
                          <span className="text-amber-300 font-semibold">
                            #{idx + 1}: {d.totalCm} cm ({(d.totalCm / 100).toFixed(2)} m)
                          </span>
                          <span className="text-stone-400 ms-2">
                            ΔX {d.dxCm} · ΔZ {d.dzCm} · ΔY {d.dyCm}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-stone-400">
                    {isAr
                      ? 'اضغط "تفعيل أداة القياس" ثم اضغط أي نقطتين داخل الغرفة لقياس عرض الممر أو المسافات بين الأجهزة.'
                      : 'Activate measuring and click any two points in the room to check aisle widths or clearances.'}
                  </p>
                )}
              </div>
            )}

            {/* TAB 6: REFERENCE SITE PHOTOS */}
            {activeTab === 'photos' && (
              <div className="flex items-center gap-2 overflow-x-auto thin-scroll pb-1">
                {REFERENCE_PHOTOS.map((photo, idx) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => onOpenPhoto(idx)}
                    aria-label={isAr ? photo.labelAr : photo.labelEn}
                    className="group relative w-20 h-16 rounded-lg overflow-hidden border border-white/15 hover:border-amber-400 shrink-0 transition-colors bg-black"
                  >
                    <img
                      src={photo.src}
                      alt={isAr ? photo.labelAr : photo.labelEn}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] font-mono-nums text-stone-100 text-center py-0.5">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
