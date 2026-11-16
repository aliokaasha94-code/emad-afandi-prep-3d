import {
  Camera,
  RotateCcw,
  Undo2,
  Redo2,
  Download,
  Upload,
  Globe,
  FileSpreadsheet,
  History,
  Bookmark,
  Share2,
} from 'lucide-react';
import type { RoomStats } from '../scene/layoutMath';
import type { Lang, RoomConfig } from '../scene/types';

interface TopBarProps {
  lang: Lang;
  room: RoomConfig;
  stats: RoomStats;
  canUndo: boolean;
  canRedo: boolean;
  snapshotCount?: number;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onExport: () => void;
  onExportPng: () => void;
  onImport: (file: File) => void;
  onToggleLang: () => void;
  onOpenCutList?: () => void;
  onOpenHistory?: () => void;
  onQuickSave?: () => void;
  onShareLink?: () => void;
}

export function TopBar({
  lang,
  room,
  stats,
  canUndo,
  canRedo,
  snapshotCount = 0,
  onUndo,
  onRedo,
  onReset,
  onExport,
  onExportPng,
  onImport,
  onToggleLang,
  onOpenCutList,
  onOpenHistory,
  onQuickSave,
  onShareLink,
}: TopBarProps) {
  const isAr = lang === 'ar';

  return (
    <header
      className="fixed top-3 left-3 right-3 z-20 pointer-events-none flex items-center justify-between gap-4"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Zone 1: Brand + Live Unboxed Room Spec Metadata */}
      <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-xl bg-[#12151ce8] border border-white/10 shadow-lg">
        <h1 className="text-sm font-semibold text-stone-100 whitespace-nowrap shrink-0">
          {isAr ? 'تصميم المكان 3D' : '3D Space Studio'}
        </h1>
        <span className="text-stone-600" aria-hidden="true">
          |
        </span>
        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-300 font-mono-nums whitespace-nowrap">
          <span>
            {(room.widthCm / 100).toFixed(2)} × {(room.depthCm / 100).toFixed(2)}{' '}
            {isAr ? 'م' : 'm'}
          </span>
          <span className="text-stone-500" aria-hidden="true">
            ·
          </span>
          <span>
            {isAr ? `ممر ${stats.clearAisleCm} سم` : `Aisle ${stats.clearAisleCm} cm`}
          </span>
          <span className="text-stone-500" aria-hidden="true">
            ·
          </span>
          <span>
            {stats.areaSqM} {isAr ? 'م²' : 'm²'}
          </span>
        </div>
      </div>

      {/* Zone 2: Utility Actions */}
      <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#12151ce8] border border-white/10 shadow-lg">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={isAr ? 'تراجع' : 'Undo'}
          title={isAr ? 'تراجع (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
          className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-stone-200 hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden md:inline">{isAr ? 'تراجع' : 'Undo'}</span>
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={isAr ? 'إعادة' : 'Redo'}
          title={isAr ? 'إعادة (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
          className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-stone-200 hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-white/10 mx-0.5" aria-hidden="true" />

        {onOpenCutList && (
          <button
            type="button"
            onClick={onOpenCutList}
            aria-label={isAr ? 'كشف مقاسات الورشة والفني' : 'Workshop Cut-List'}
            title={isAr ? 'عرض كشف مقاسات وتفصيل الستانلس ستيل للورشة' : 'Open Stainless Cut-List'}
            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isAr ? '📋 كشف مقاسات الورشة' : 'Cut-List'}</span>
          </button>
        )}

        {/* Quick Save Snapshot */}
        {onQuickSave && (
          <button
            type="button"
            onClick={onQuickSave}
            aria-label={isAr ? 'حفظ نسخة الآن' : 'Save Version'}
            title={isAr ? 'حفظ نسخة جديدة من التعديلات الحالية مع التاريخ' : 'Save current layout snapshot'}
            className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">{isAr ? '💾 حفظ نسخة' : 'Save'}</span>
          </button>
        )}

        {/* Version History Modal Trigger */}
        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            aria-label={isAr ? 'سجل النسخ المحفوظة' : 'Version History'}
            title={isAr ? 'عرض سجل النسخ السابقة واستعادتها أو مشاركتها' : 'View and restore layout versions'}
            className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-stone-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">{isAr ? 'النسخ' : 'Versions'}</span>
            {snapshotCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/25 text-amber-300 border border-amber-500/30">
                {snapshotCount}
              </span>
            )}
          </button>
        )}

        {/* Instant Share Link */}
        {onShareLink && (
          <button
            type="button"
            onClick={onShareLink}
            aria-label={isAr ? 'مشاركة رابط بالتعديلات الحالية' : 'Share Link'}
            title={isAr ? 'نسخ رابط يفتح بنفس مقاساتك وتعديلاتك لأي شخص' : 'Copy link with current layout'}
            className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden md:inline">{isAr ? 'مشاركة رابط' : 'Share'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onExportPng}
          aria-label={isAr ? 'حفظ صورة PNG للصنيعي' : 'Save PNG Render'}
          title={isAr ? 'تحميل صورة جاهزة للصنيعي PNG' : 'Save PNG Image'}
          className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/15 transition-colors whitespace-nowrap shrink-0"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden md:inline">{isAr ? 'صورة PNG' : 'PNG'}</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          aria-label={isAr ? 'تصدير المخطط JSON' : 'Export Layout JSON'}
          title={isAr ? 'حفظ نسخة JSON' : 'Export JSON'}
          className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-stone-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span className="hidden lg:inline">{isAr ? 'حفظ JSON' : 'Export'}</span>
        </button>

        <label
          className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-stone-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title={isAr ? 'استيراد مخطط JSON' : 'Import JSON'}
        >
          <Upload className="w-4 h-4" />
          <span className="hidden lg:inline">{isAr ? 'استيراد' : 'Import'}</span>
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label={isAr ? 'استيراد ملف مخطط' : 'Import layout file'}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </label>

        <button
          type="button"
          onClick={onReset}
          aria-label={isAr ? 'إعادة للوضع الأصلي' : 'Reset to Original'}
          title={isAr ? 'إعادة ترتيب الصور الأصلي' : 'Reset to Original Photos'}
          className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/15 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden md:inline">{isAr ? 'الأصل' : 'Reset'}</span>
        </button>

        <span className="w-px h-5 bg-white/10 mx-0.5" aria-hidden="true" />

        <button
          type="button"
          onClick={onToggleLang}
          aria-label={isAr ? 'Switch to English' : 'التبديل للعربية'}
          className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-stone-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAr ? 'EN' : 'عربي'}</span>
        </button>
      </div>
    </header>
  );
}
