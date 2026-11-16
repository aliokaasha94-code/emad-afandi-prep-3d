import { useState, useId } from 'react';
import {
  History,
  Bookmark,
  Save,
  Share2,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  Download,
  X,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Lang, LayoutSnapshot } from '../scene/types';

export interface SavedSnapshot {
  id: string;
  name: string;
  createdAt: string; // ISO String
  itemCount: number;
  dimensionsSummary: string;
  data: LayoutSnapshot;
}

interface VersionHistoryModalProps {
  lang: Lang;
  currentSnapshot: LayoutSnapshot;
  snapshots: SavedSnapshot[];
  onClose: () => void;
  onSaveSnapshot: (name: string) => void;
  onRestoreSnapshot: (snapshot: SavedSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  onRestoreOriginal: () => void;
  onShareLink: () => void;
}

export function VersionHistoryModal({
  lang,
  currentSnapshot,
  snapshots,
  onClose,
  onSaveSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onRestoreOriginal,
  onShareLink,
}: VersionHistoryModalProps) {
  const isAr = lang === 'ar';
  const [snapshotName, setSnapshotName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPermanentCode, setCopiedPermanentCode] = useState(false);
  const inputId = useId();

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    const finalName =
      snapshotName.trim() ||
      (isAr
        ? `نسخة ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
        : `Snapshot ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    onSaveSnapshot(finalName);
    setSnapshotName('');
  };

  const copySnapshotShareLink = (snap: SavedSnapshot) => {
    try {
      const minified = JSON.stringify({
        room: snap.data.room,
        items: snap.data.items,
      });
      const encoded = encodeURIComponent(minified);
      const url = `${window.location.origin}${window.location.pathname}#layout=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(snap.id);
        setTimeout(() => setCopiedId(null), 2500);
      });
    } catch {
      // Fallback
    }
  };

  const downloadSnapshotJson = (snap: SavedSnapshot) => {
    const blob = new Blob([JSON.stringify(snap.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emad-afandi-layout-${snap.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPermanentDefaultData = () => {
    const raw = JSON.stringify(currentSnapshot, null, 2);
    navigator.clipboard.writeText(raw).then(() => {
      setCopiedPermanentCode(true);
      setTimeout(() => setCopiedPermanentCode(false), 3000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-2xl bg-[#131720] border border-white/12 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {isAr ? 'إدارة وحفظ النسخ والتعديلات' : 'Layout Versions & Snapshots'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-normal">
                  {snapshots.length} {isAr ? 'نسخة' : 'versions'}
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                {isAr
                  ? 'احفظ أي تعديل، ارجع للنسخ السابقة، أو شارك الرابط مع الصنيعي'
                  : 'Save layout versions, restore past changes, or share direct links'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Current State Form */}
        <div className="p-4 sm:p-5 bg-white/[0.015] border-b border-white/10">
          <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            <div className="flex-1 relative">
              <label htmlFor={inputId} className="sr-only">
                {isAr ? 'اسم النسخة' : 'Snapshot name'}
              </label>
              <input
                id={inputId}
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder={
                  isAr
                    ? 'اكتب اسم للنسخة (مثال: أرفف شمال بعد تعديل الارتفاع)'
                    : 'Enter version name (e.g., Left shelves adjusted)'
                }
                className="w-full h-10 px-3.5 rounded-xl bg-white/5 border border-white/12 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
            >
              <Bookmark className="w-4 h-4" />
              <span>{isAr ? '💾 حفظ نسخة الآن' : 'Save Version'}</span>
            </button>
            <button
              type="button"
              onClick={onShareLink}
              className="h-10 px-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
              title={isAr ? 'نسخ رابط يفتح نفس التعديلات لأي شخص' : 'Share link with current changes'}
            >
              <Share2 className="w-4 h-4" />
              <span>{isAr ? '🔗 مشاركة رابط' : 'Share Link'}</span>
            </button>
          </form>
        </div>

        {/* Explainability Note */}
        <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              {isAr ? '💡 كيف يعمل حفظ التعديلات؟' : '💡 How does saving work?'}
            </p>
            <p className="text-[11px] leading-relaxed text-stone-300">
              {isAr
                ? '• أي تعديل تعمله يتحفظ تلقائياً في متصفحك أنت. لكي يفتح أي شخص آخر (الصنيعي أو عماد) على نفس تعديلاتك، اضغط "مشاركة رابط" وابعته له على واتساب، أو اضغط "تثبيت دائم" لدمجها في الرابط الرئيسي للجميع.'
                : '• Local changes save in your browser. To send current edits to others, use "Share Link", or export to make it the default for everyone.'}
            </p>
          </div>
        </div>

        {/* Snapshots List */}
        <div className="p-4 sm:p-5 max-h-[50vh] overflow-y-auto space-y-2.5">
          {snapshots.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-white/10">
              <Bookmark className="w-8 h-8 text-stone-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-300">
                {isAr ? 'لا توجد نسخ محفوظة بعد' : 'No saved versions yet'}
              </p>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                {isAr
                  ? 'اكتب اسماً في الخانة أعلاه واضغط "حفظ نسخة الآن" لحفظ أي تعديل عملته في الأبعاد أو العناصر.'
                  : 'Type a name above and click "Save Version" to keep a restore point.'}
              </p>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/8 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-stone-100 truncate">
                      {snap.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-400 font-mono-nums">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      {new Date(snap.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      {snap.itemCount} {isAr ? 'عنصر' : 'items'}
                    </span>
                    <span>•</span>
                    <span>{snap.dimensionsSummary}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onRestoreSnapshot(snap)}
                    className="h-8 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title={isAr ? 'استعادة هذه النسخة' : 'Restore this version'}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isAr ? 'استعادة' : 'Restore'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copySnapshotShareLink(snap)}
                    className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-white/10 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title={isAr ? 'نسخ رابط مباشر لهذه النسخة' : 'Copy share link for this version'}
                  >
                    {copiedId === snap.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === snap.id ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'رابط' : 'Link')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadSnapshotJson(snap)}
                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                    title={isAr ? 'تنزيل ملف JSON' : 'Download JSON file'}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteSnapshot(snap.id)}
                    className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/20 flex items-center justify-center transition-colors cursor-pointer"
                    title={isAr ? 'حذف هذه النسخة' : 'Delete this version'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#0e1118] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onRestoreOriginal}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة ضبط للمخطط الأصلي للكافيه' : 'Reset to default cafe blueprint'}</span>
          </button>

          <button
            type="button"
            onClick={copyPermanentDefaultData}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            title={isAr ? 'نسخ بيانات التصميم الحالية لتثبيتها في الكود للأبد' : 'Copy layout data for permanent deploy'}
          >
            {copiedPermanentCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {copiedPermanentCode
                ? isAr
                  ? 'تم نسخ بيانات التثبيت!'
                  : 'Copied!'
                : isAr
                ? 'تثبيت كافتراضي للجميع (نسخ الكود للمطور)'
                : 'Make Permanent Default (Copy Code)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
