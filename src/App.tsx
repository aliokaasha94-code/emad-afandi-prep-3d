import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomControlDock } from './components/BottomControlDock';
import { FabricationCutListModal } from './components/FabricationCutListModal';
import { FabricationSpecCard } from './components/FabricationSpecCard';
import { PhotosGalleryModal } from './components/PhotosGalleryModal';
import { SceneViewport } from './components/SceneViewport';
import { TopBar } from './components/TopBar';
import { VersionHistoryModal, type SavedSnapshot } from './components/VersionHistoryModal';
import {
  clampItemToRoom,
  computeDistanceCm,
  computeRoomStats,
  parseLayoutJson,
  pushHistory,
  redoHistory,
  serializeLayout,
  undoHistory,
  type HistoryState,
  type WalkKeysState,
} from './scene/layoutMath';
import {
  INITIAL_ROOM_CONFIG,
  INITIAL_SCENE_ITEMS,
  LEGACY_ROOM_CONFIG,
  LEGACY_SCENE_ITEMS,
  REFERENCE_PHOTOS,
} from './scene/presets';
import type {
  CameraPresetId,
  CatalogTemplate,
  DockTab,
  Lang,
  LayoutSnapshot,
  Measurement,
  NavMode,
  Point3D,
  RoomConfig,
  SceneItem,
  ToolMode,
} from './scene/types';

const STORAGE_KEY = 'emad_afandi_3d_space_v8_extended_shelves';
const SNAPSHOTS_KEY = 'emad_afandi_snapshots_v1';

function loadSavedSnapshots(): SavedSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch {
    // Ignore
  }
  return [];
}

function loadInitialSnapshot(): LayoutSnapshot {
  try {
    // 1. First priority: Direct shared URL hash (#layout=... or #data=...)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashStr = window.location.hash.slice(1);
      const match = hashStr.match(/(?:layout|data)=([^&]+)/) || [null, hashStr];
      const encoded = match[1];
      if (encoded) {
        try {
          const decoded = decodeURIComponent(encoded);
          const parsedFromUrl = parseLayoutJson(decoded);
          if (parsedFromUrl) {
            return parsedFromUrl;
          }
        } catch {
          // Ignore URL parse error
        }
      }
    }

    // 2. Second priority: Local browser saved layout
    const saved =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('emad_afandi_3d_space_v7_fabrication') ||
      localStorage.getItem('emad_afandi_3d_space_v6');
    if (saved) {
      const parsed = parseLayoutJson(saved);
      if (parsed) {
        // Upgrade left shelves to 353cm (leaving 5cm gap to black box) if they had old 236cm dimensions
        const updatedItems = parsed.items.map((item) => {
          if (item.id === 'shelf_left_u' || item.id === 'shelf_left_upper') {
            const fresh = INITIAL_SCENE_ITEMS.find((i) => i.id === item.id);
            if (fresh) {
              return {
                ...item,
                widthCm: 353,
                baseW: 353,
                zCm: -24,
                bracketCount: 6,
                nameAr: fresh.nameAr,
                nameEn: fresh.nameEn,
                fabricationNotesAr: fresh.fabricationNotesAr,
              };
            }
          }
          return item;
        });
        return {
          room: parsed.room,
          items: updatedItems,
        };
      }
    }
  } catch {
    // Ignore storage errors
  }
  return {
    room: { ...INITIAL_ROOM_CONFIG, walls: { ...INITIAL_ROOM_CONFIG.walls } },
    items: INITIAL_SCENE_ITEMS.map((i) => ({ ...i })),
  };
}

export default function App() {
  const [lang, setLang] = useState<Lang>('ar');
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: loadInitialSnapshot(),
    future: [],
  }));

  const [snapshots, setSnapshots] = useState<SavedSnapshot[]>(loadSavedSnapshots);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCutListModal, setShowCutListModal] = useState<boolean>(false);
  const [navMode, setNavMode] = useState<NavMode>('orbit');
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [gridSnapCm, setGridSnapCm] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<DockTab>('nav');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [cameraPresetTrigger, setCameraPresetTrigger] = useState<{
    id: CameraPresetId;
    seq: number;
  } | null>(null);

  const [pendingPlaceTemplate, setPendingPlaceTemplate] = useState<CatalogTemplate | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [pendingMeasureStart, setPendingMeasureStart] = useState<Point3D | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const walkPadRef = useRef<WalkKeysState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  const capturePngFnRef = useRef<(() => string | null) | null>(null);
  const handleRegisterCapture = useCallback((fn: (() => string | null) | null) => {
    capturePngFnRef.current = fn;
  }, []);

  const { room, items } = history.present;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeLayout(history.present));
    } catch {
      // Ignore quota errors
    }
  }, [history.present]);

  const notify = useCallback((msg: string) => {
    setStatusNotice(msg);
  }, []);

  useEffect(() => {
    if (!statusNotice) return;
    const t = window.setTimeout(() => setStatusNotice(null), 2600);
    return () => clearTimeout(t);
  }, [statusNotice]);

  const stats = useMemo(() => computeRoomStats(items, room), [items, room]);
  const selectedItem = useMemo(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  const updateRoom = useCallback(
    (nextOrUpdater: RoomConfig | ((prev: RoomConfig) => RoomConfig), recordHistory = true) => {
      setHistory((prev) => {
        const nextRoom =
          typeof nextOrUpdater === 'function' ? nextOrUpdater(prev.present.room) : nextOrUpdater;
        const nextSnap: LayoutSnapshot = {
          room: nextRoom,
          items: prev.present.items.map((it) => clampItemToRoom(it, nextRoom)),
        };
        if (!recordHistory) {
          return { ...prev, present: nextSnap };
        }
        return pushHistory(prev, nextSnap);
      });
    },
    []
  );

  const updateItem = useCallback((updated: SceneItem, recordHistory = true) => {
    setHistory((prev) => {
      const clamped = clampItemToRoom(updated, prev.present.room);
      const nextItems = prev.present.items.map((it) => (it.id === clamped.id ? clamped : it));
      const nextSnap: LayoutSnapshot = {
        room: prev.present.room,
        items: nextItems,
      };
      if (!recordHistory) {
        return { ...prev, present: nextSnap };
      }
      return pushHistory(prev, nextSnap);
    });
  }, []);

  const handleSelectItem = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setActiveTab('edit');
      setToolMode((prev) => (prev === 'place' || prev === 'measure' ? 'select' : prev));
    }
  }, []);

  const handleDuplicateItem = useCallback(
    (id: string) => {
      const source = items.find((i) => i.id === id);
      if (!source) return;
      const newId = `${source.kind}_${Date.now().toString(36)}`;
      const copy: SceneItem = clampItemToRoom(
        {
          ...source,
          id: newId,
          nameAr: `${source.nameAr} (نسخة)`,
          nameEn: `${source.nameEn} (Copy)`,
          xCm: source.xCm === 0 ? 25 : source.xCm > 0 ? source.xCm - 25 : source.xCm + 25,
          zCm: source.zCm + 25,
          locked: false,
        },
        room
      );
      setHistory((prev) =>
        pushHistory(prev, {
          room: prev.present.room,
          items: [...prev.present.items, copy],
        })
      );
      setSelectedId(newId);
      setActiveTab('edit');
    },
    [items, room]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      setHistory((prev) =>
        pushHistory(prev, {
          room: prev.present.room,
          items: prev.present.items.filter((i) => i.id !== id),
        })
      );
      if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [selectedId]
  );

  const spawnTemplateAt = useCallback(
    (tpl: CatalogTemplate, xCm: number, zCm: number) => {
      const newId = `${tpl.kind}_${Date.now().toString(36)}`;
      const nextItem: SceneItem = clampItemToRoom(
        {
          id: newId,
          kind: tpl.kind,
          nameAr: tpl.nameAr,
          nameEn: tpl.nameEn,
          category: tpl.category,
          xCm,
          yCm: tpl.defaultYCm,
          zCm,
          rotYDeg: 0,
          widthCm: tpl.widthCm,
          depthCm: tpl.depthCm,
          heightCm: tpl.heightCm,
          baseW: tpl.widthCm,
          baseD: tpl.depthCm,
          baseH: tpl.heightCm,
          finish: 'original',
          locked: false,
          visible: true,
          wallMounted: tpl.wallMounted,
        },
        room
      );
      setHistory((prev) =>
        pushHistory(prev, {
          room: prev.present.room,
          items: [...prev.present.items, nextItem],
        })
      );
      setSelectedId(newId);
      setPendingPlaceTemplate(null);
      setToolMode('translate');
      setActiveTab('edit');
      notify(lang === 'ar' ? `تمت إضافة: ${tpl.nameAr}` : `Added: ${tpl.nameEn}`);
    },
    [lang, notify, room]
  );

  const handleStartPlaceTemplate = useCallback((tpl: CatalogTemplate) => {
    setNavMode('orbit');
    setPendingPlaceTemplate(tpl);
    setToolMode('place');
  }, []);

  const handlePlaceAtPoint = useCallback(
    (ptCm: Point3D) => {
      if (!pendingPlaceTemplate) return;
      spawnTemplateAt(pendingPlaceTemplate, ptCm.x, ptCm.z);
    },
    [pendingPlaceTemplate, spawnTemplateAt]
  );

  const handleUndo = useCallback(() => {
    setHistory((prev) => undoHistory(prev));
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((prev) => redoHistory(prev));
  }, []);

  const handleApplyLayoutPreset = useCallback(
    (preset: 'stainless' | 'legacy') => {
      const srcRoom = preset === 'stainless' ? INITIAL_ROOM_CONFIG : LEGACY_ROOM_CONFIG;
      const srcItems = preset === 'stainless' ? INITIAL_SCENE_ITEMS : LEGACY_SCENE_ITEMS;
      const fresh: LayoutSnapshot = {
        room: { ...srcRoom, walls: { ...srcRoom.walls } },
        items: srcItems.map((i) => ({ ...i })),
      };
      setHistory((prev) => pushHistory(prev, fresh));
      setSelectedId(null);
      setPendingPlaceTemplate(null);
      setCameraPresetTrigger((prev) => ({ id: 'entrance', seq: (prev?.seq ?? 0) + 1 }));
      notify(
        preset === 'stainless'
          ? lang === 'ar'
            ? 'تم تحميل التصميم الجديد (استالس 220 × 400 سم)'
            : 'Loaded New Stainless Layout (220 × 400 cm)'
          : lang === 'ar'
          ? 'تم تحميل الوضع السابق (الخشب 235 × 460 سم)'
          : 'Loaded Previous Wood Layout (235 × 460 cm)'
      );
    },
    [lang, notify]
  );

  const handleReset = useCallback(() => {
    const fresh: LayoutSnapshot = {
      room: { ...INITIAL_ROOM_CONFIG, walls: { ...INITIAL_ROOM_CONFIG.walls } },
      items: INITIAL_SCENE_ITEMS.map((i) => ({ ...i })),
    };
    setHistory((prev) => pushHistory(prev, fresh));
    setSelectedId(null);
    setPendingPlaceTemplate(null);
    setMeasurements([]);
    setPendingMeasureStart(null);
    setCameraPresetTrigger((prev) => ({ id: 'entrance', seq: (prev?.seq ?? 0) + 1 }));
    notify(
      lang === 'ar'
        ? 'تمت استعادة التصميم الجديد (استالس 220 × 400 سم)'
        : 'Reset to New Stainless Layout (220 × 400 cm)'
    );
  }, [lang, notify]);

  const handleExport = useCallback(() => {
    const json = serializeLayout(history.present);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'space-layout-3d.json';
    a.click();
    URL.revokeObjectURL(url);
    notify(lang === 'ar' ? 'تم تصدير ملف المخطط JSON' : 'Exported layout JSON');
  }, [history.present, lang, notify]);

  const handleExportPng = useCallback(() => {
    const dataUrl = capturePngFnRef.current?.();
    if (!dataUrl) {
      notify(lang === 'ar' ? 'تعذر التقاط الصورة الآن' : 'Could not capture render');
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = room.cadMode ? 'emad-afandi-autocad-3d.png' : 'emad-afandi-3d-view.png';
    a.click();
    notify(lang === 'ar' ? 'تم حفظ صورة التصميم PNG جاهزة للصنيعي' : 'Saved 3D PNG image');
  }, [lang, notify, room.cadMode]);

  const handleImport = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const parsed = parseLayoutJson(text);
        if (!parsed) {
          notify(lang === 'ar' ? 'ملف JSON غير صالح' : 'Invalid layout JSON file');
          return;
        }
        setHistory((prev) => pushHistory(prev, parsed));
        setSelectedId(null);
        notify(lang === 'ar' ? 'تم استيراد المخطط بنجاح' : 'Imported layout successfully');
      };
      reader.readAsText(file);
    },
    [lang, notify]
  );

  const handleSaveSnapshot = useCallback(
    (name: string) => {
      const snap: SavedSnapshot = {
        id: `snap_${Date.now().toString(36)}`,
        name,
        createdAt: new Date().toISOString(),
        itemCount: history.present.items.length,
        dimensionsSummary: `${history.present.room.widthCm} × ${history.present.room.depthCm} سم`,
        data: {
          room: { ...history.present.room, walls: { ...history.present.room.walls } },
          items: history.present.items.map((i) => ({ ...i })),
        },
      };
      setSnapshots((prev) => {
        const next = [snap, ...prev];
        try {
          localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      notify(lang === 'ar' ? `✅ تم حفظ النسخة "${name}" بنجاح!` : `✅ Version "${name}" saved!`);
    },
    [history.present, lang, notify]
  );

  const handleQuickSave = useCallback(() => {
    const timeStr = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    handleSaveSnapshot(lang === 'ar' ? `تعديل (${timeStr})` : `Edit (${timeStr})`);
  }, [handleSaveSnapshot, lang]);

  const handleRestoreSnapshot = useCallback(
    (snap: SavedSnapshot) => {
      setHistory((prev) =>
        pushHistory(prev, {
          room: { ...snap.data.room, walls: { ...snap.data.room.walls } },
          items: snap.data.items.map((i) => ({ ...i })),
        })
      );
      setSelectedId(null);
      setShowHistoryModal(false);
      notify(lang === 'ar' ? `🔄 تم استعادة النسخة: ${snap.name}` : `🔄 Restored: ${snap.name}`);
    },
    [lang, notify]
  );

  const handleDeleteSnapshot = useCallback((id: string) => {
    setSnapshots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleShareLink = useCallback(() => {
    try {
      const minified = JSON.stringify({
        room: history.present.room,
        items: history.present.items,
      });
      const encoded = encodeURIComponent(minified);
      const url = `${window.location.origin}${window.location.pathname}#layout=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        notify(
          lang === 'ar'
            ? '🔗 تم نسخ رابط المشاركة بالتعديلات الحالية! ابعته لأي شخص وهيفتح بنفس المقاسات.'
            : '🔗 Share link copied with current layout!'
        );
      });
    } catch {
      notify(lang === 'ar' ? 'تعذر إنشاء الرابط' : 'Failed to generate link');
    }
  }, [history.present, lang, notify]);

  const handleMeasureClick = useCallback(
    (ptCm: Point3D) => {
      if (!pendingMeasureStart) {
        setPendingMeasureStart(ptCm);
      } else {
        const d = computeDistanceCm(pendingMeasureStart, ptCm);
        setMeasurements((prev) => [
          ...prev,
          {
            id: `m_${Date.now().toString(36)}`,
            startCm: pendingMeasureStart,
            endCm: ptCm,
            distanceCm: d.totalCm,
          },
        ]);
        setPendingMeasureStart(null);
      }
    },
    [pendingMeasureStart]
  );

  const handleChangeTab = useCallback((tab: DockTab) => {
    setActiveTab(tab);
    if (tab !== 'add') {
      setPendingPlaceTemplate(null);
    }
    if (tab === 'measure') {
      setToolMode('measure');
    } else {
      setToolMode((prev) => (prev === 'measure' || prev === 'place' ? 'translate' : prev));
    }
  }, []);

  const handleSelectCameraPreset = useCallback((preset: CameraPresetId) => {
    setNavMode('orbit');
    setCameraPresetTrigger((prev) => ({ id: preset, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((c) => !c);
      } else if (e.key === 'Escape') {
        setPendingMeasureStart(null);
        setPendingPlaceTemplate(null);
        if (toolMode === 'measure' || toolMode === 'place') setToolMode('select');
        else setSelectedId(null);
      } else if (navMode === 'orbit' && selectedId) {
        if (e.key.toLowerCase() === 'g') setToolMode('translate');
        else if (e.key.toLowerCase() === 'r') setToolMode('rotate');
        else if (e.key.toLowerCase() === 's') setToolMode('scale');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRedo, handleUndo, navMode, selectedId, toolMode]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0e1116]">
      <SceneViewport
        room={room}
        items={items}
        selectedId={selectedId}
        navMode={navMode}
        toolMode={toolMode}
        gridSnapCm={gridSnapCm}
        cameraPresetTrigger={cameraPresetTrigger}
        measurements={measurements}
        pendingMeasureStart={pendingMeasureStart}
        walkPadRef={walkPadRef}
        onSelectItem={handleSelectItem}
        onUpdateItem={updateItem}
        onMeasureClick={handleMeasureClick}
        onPlaceAtPoint={handlePlaceAtPoint}
        onRegisterCapture={handleRegisterCapture}
      />

      <TopBar
        lang={lang}
        room={room}
        stats={stats}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        snapshotCount={snapshots.length}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={handleReset}
        onExport={handleExport}
        onExportPng={handleExportPng}
        onImport={handleImport}
        onToggleLang={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}
        onOpenCutList={() => setShowCutListModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onQuickSave={handleQuickSave}
        onShareLink={handleShareLink}
      />

      {statusNotice && (
        <div
          role="status"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-lg bg-[#171c26f2] border border-amber-400/40 text-xs font-medium text-amber-200 shadow-lg pointer-events-none"
        >
          {statusNotice}
        </div>
      )}

      {/* Fabrication Spec Floating Card for the Technician */}
      <FabricationSpecCard
        item={selectedItem}
        lang={lang}
        onClose={() => setSelectedId(null)}
        onOpenCutList={() => setShowCutListModal(true)}
      />

      {/* Workshop Fabrication Cut-List Full Modal */}
      {showCutListModal && (
        <FabricationCutListModal
          items={items}
          room={room}
          lang={lang}
          onClose={() => setShowCutListModal(false)}
          onSelectItem={(id) => {
            handleSelectItem(id);
          }}
        />
      )}

      <BottomControlDock
        lang={lang}
        collapsed={dockCollapsed}
        activeTab={activeTab}
        navMode={navMode}
        toolMode={toolMode}
        gridSnapCm={gridSnapCm}
        room={room}
        items={items}
        selectedItem={selectedItem}
        pendingPlaceTemplate={pendingPlaceTemplate}
        measurements={measurements}
        pendingMeasureStart={pendingMeasureStart}
        walkPadRef={walkPadRef}
        onToggleCollapse={() => setDockCollapsed((c) => !c)}
        onChangeTab={handleChangeTab}
        onChangeNavMode={setNavMode}
        onChangeToolMode={setToolMode}
        onChangeGridSnap={setGridSnapCm}
        onSelectCameraPreset={handleSelectCameraPreset}
        onSelectItem={handleSelectItem}
        onUpdateItem={updateItem}
        onDuplicateItem={handleDuplicateItem}
        onDeleteItem={handleDeleteItem}
        onUpdateRoom={updateRoom}
        onApplyLayoutPreset={handleApplyLayoutPreset}
        onStartPlaceTemplate={handleStartPlaceTemplate}
        onDropTemplateCenter={(tpl) => spawnTemplateAt(tpl, 0, 0)}
        onCancelPlace={() => {
          setPendingPlaceTemplate(null);
          setToolMode('select');
        }}
        onClearMeasurements={() => {
          setMeasurements([]);
          setPendingMeasureStart(null);
        }}
        onOpenPhoto={(idx) => setActivePhotoIdx(idx)}
      />

      <PhotosGalleryModal
        photos={REFERENCE_PHOTOS}
        activeIndex={activePhotoIdx}
        lang={lang}
        onClose={() => setActivePhotoIdx(null)}
        onChangeIndex={setActivePhotoIdx}
      />

      {showHistoryModal && (
        <VersionHistoryModal
          lang={lang}
          currentSnapshot={history.present}
          snapshots={snapshots}
          onClose={() => setShowHistoryModal(false)}
          onSaveSnapshot={handleSaveSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
          onDeleteSnapshot={handleDeleteSnapshot}
          onRestoreOriginal={handleReset}
          onShareLink={handleShareLink}
        />
      )}
    </main>
  );
}
