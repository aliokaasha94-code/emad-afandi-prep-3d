import { useState } from 'react';
import {
  Ruler,
  Layers,
  Wrench,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  FileSpreadsheet,
} from 'lucide-react';
import type { Lang, SceneItem } from '../scene/types';

interface FabricationSpecCardProps {
  item: SceneItem | null;
  lang: Lang;
  onClose: () => void;
  onOpenCutList: () => void;
}

export function FabricationSpecCard({
  item,
  lang,
  onClose,
  onOpenCutList,
}: FabricationSpecCardProps) {
  const [copied, setCopied] = useState(false);
  const isAr = lang === 'ar';

  if (!item) return null;

  const isShelf = item.category === 'storage' || item.kind.includes('shelf');
  const isBar = item.category === 'counter' || item.kind.includes('bar');

  const defaultGrade =
    item.materialGrade ||
    (isShelf || isBar
      ? 'ستانلس ستيل 304 غذائي (AISI 304 - سمك 1.2 مم)'
      : 'ستانلس ستيل مطفي صناعي');

  const defaultNotes =
    item.fabricationNotesAr ||
    (isShelf
      ? 'شاسيه صاج ستانلس 304 مع شفة أمان أمامية بارتفاع 1.5 سم لمنع سقوط الزجاجات + شفة حماية خلفية 2 سم و2-5 كوابيل علب 2.5×2.5 سم مثبتة بفيشر صلب في الحائط'
      : isBar
      ? 'قرصة ستانلس 304 سمك 1.5 مم مصفحة بخشب كونتر 18 مم سفلي لامتصاص الصدمات والصوت، وشاسيه أرجل علب 40×40 مم مع كعوب رجلاش'
      : 'مطابقة المقاسات على الطبيعة قبل القص والتثبيت');

  const copyToClipboard = () => {
    const text = [
      `📌 مواصفات تصنيع: ${isAr ? item.nameAr : item.nameEn} ${item.code ? `(${item.code})` : ''}`,
      `📐 المقاسات (سم):`,
      `• الطول / العرض: ${item.widthCm} سم`,
      `• العمق: ${item.depthCm} سم`,
      `• السمك / الارتفاع: ${item.heightCm} سم`,
      `• الارتفاع عن منسوب الأرضية: ${item.yCm} سم`,
      item.bracketCount ? `• عدد الكوابيل: ${item.bracketCount} كابولي ستانلس` : '',
      `🛠️ الخامة: ${defaultGrade}`,
      `📝 ملاحظات التنفيذ: ${defaultNotes}`,
      `📍 الموقع: كافيه عماد أفندي - منطقة الباك والتحضير`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    });
  };

  return (
    <div
      data-testid="fabrication-spec-card"
      className="fixed top-18 right-4 z-30 w-[min(380px,92vw)] pointer-events-auto rounded-2xl bg-[#0f131ce8] backdrop-blur-xl border border-amber-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.65)] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Header Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

      {/* Card Header */}
      <div className="p-3.5 pb-2.5 border-b border-white/10 flex items-start justify-between gap-3 bg-white/[0.02]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold tracking-wider">
              {item.code || 'SPEC'}
            </span>
            <span className="text-[11px] text-stone-400 font-medium">
              {isAr ? 'بيانات التصنيع الفني' : 'Fabrication Spec'}
            </span>
          </div>
          <h3 className="text-sm font-bold text-stone-100 truncate">
            {isAr ? item.nameAr : item.nameEn}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Dimensions Grid */}
      <div className="p-3.5 space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          {/* Width */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/8 flex flex-col justify-between">
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Ruler className="w-3 h-3 text-amber-400" />
              {isAr ? 'الطول (العرض)' : 'Length (Width)'}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-amber-300">
                {item.widthCm}
              </span>
              <span className="text-[11px] text-stone-400">{isAr ? 'سم' : 'cm'}</span>
            </div>
          </div>

          {/* Depth */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/8 flex flex-col justify-between">
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" />
              {isAr ? 'العمق (البروز)' : 'Depth'}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-amber-300">
                {item.depthCm}
              </span>
              <span className="text-[11px] text-stone-400">{isAr ? 'سم' : 'cm'}</span>
            </div>
          </div>

          {/* Height / Thickness */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/8 flex flex-col justify-between">
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-amber-400" />
              {isAr ? 'السمك / الارتفاع' : 'Height / Thickness'}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-stone-200">
                {item.heightCm}
              </span>
              <span className="text-[11px] text-stone-400">{isAr ? 'سم' : 'cm'}</span>
            </div>
          </div>

          {/* Elevation from floor */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/15 to-transparent border border-amber-500/30 flex flex-col justify-between">
            <span className="text-[11px] text-amber-300 flex items-center gap-1 font-semibold">
              <Wrench className="w-3 h-3 text-amber-400" />
              {isAr ? 'منسوب الارتفاع من الأرض' : 'Elevation from Floor'}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-extrabold font-mono text-amber-200">
                {item.yCm}
              </span>
              <span className="text-[11px] text-amber-400/80">{isAr ? 'سم' : 'cm'}</span>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="p-2.5 rounded-xl bg-black/30 border border-white/8 space-y-2">
          {/* Material Grade */}
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                {isAr ? 'الخامة الموصى بها:' : 'Material Spec:'}
              </span>
              <span className="text-stone-200 font-medium leading-relaxed">
                {defaultGrade}
              </span>
            </div>
          </div>

          {/* Brackets count if shelf */}
          {item.bracketCount && (
            <div className="flex items-start gap-2 pt-1 border-t border-white/5">
              <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                  {isAr ? 'كوابيل التثبيت:' : 'Brackets:'}
                </span>
                <span className="text-stone-200 font-medium">
                  {isAr
                    ? `${item.bracketCount} كوابيل ستانلس علب 25×25 مم بفيشر صلب`
                    : `${item.bracketCount} heavy-duty stainless wall brackets`}
                </span>
              </div>
            </div>
          )}

          {/* Fabrication Notes */}
          <div className="pt-1 border-t border-white/5">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1">
              {isAr ? 'ملاحظات الصنيعي والتنفيذ:' : 'Workshop Notes:'}
            </span>
            <p className="text-[11px] text-stone-300 leading-relaxed bg-black/40 p-2 rounded-lg border border-white/5">
              {defaultNotes}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={copyToClipboard}
            className={`flex-1 h-8.5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              copied
                ? 'bg-emerald-500 text-stone-950 font-bold'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>
              {copied
                ? isAr
                  ? 'تم نسخ المقاسات! ✓'
                  : 'Copied!'
                : isAr
                ? 'نسخ المقاسات للواتساب'
                : 'Copy Spec'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenCutList}
            className="h-8.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/10 shrink-0"
            title={isAr ? 'فتح كشف مقاسات الورشة الشامل' : 'Open Cut-List Sheet'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isAr ? 'كشف الورشة' : 'Cut-List'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
