import { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  X,
  Ruler,
  Wrench,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Lang, RoomConfig, SceneItem } from '../scene/types';

interface FabricationCutListModalProps {
  items: SceneItem[];
  room: RoomConfig;
  lang: Lang;
  onClose: () => void;
  onSelectItem: (id: string) => void;
}

export function FabricationCutListModal({
  items,
  room,
  lang,
  onClose,
  onSelectItem,
}: FabricationCutListModalProps) {
  const [copied, setCopied] = useState(false);
  const isAr = lang === 'ar';

  // Filter items relevant to stainless fabrication (shelves + counters)
  const stainlessShelves = items.filter(
    (i) => i.kind.includes('shelf') || i.category === 'storage'
  );
  const stainlessBars = items.filter(
    (i) => i.kind.includes('bar') || i.kind.includes('counter') || i.category === 'counter'
  );
  const otherItems = items.filter(
    (i) =>
      !i.kind.includes('shelf') &&
      !i.kind.includes('bar') &&
      !i.kind.includes('counter') &&
      i.category !== 'storage' &&
      i.category !== 'counter'
  );

  // Stats calculation
  const totalShelfLinearM = (
    stainlessShelves.reduce((acc, s) => acc + s.widthCm, 0) / 100
  ).toFixed(2);
  const totalBrackets = stainlessShelves.reduce(
    (acc, s) => acc + (s.bracketCount || (s.widthCm > 300 ? 5 : s.widthCm > 180 ? 3 : 2)),
    0
  );
  const totalBarLinearM = (
    stainlessBars.reduce((acc, b) => acc + b.widthCm, 0) / 100
  ).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyAll = () => {
    const lines = [
      `==================================================`,
      `📋 كشف مقاسات وتفصيل الستانلس ستيل - كافيه عماد أفندي`,
      `الموقع: منطقة الباك والتحضير (220 × 400 سم · ارتفاع 280 سم)`,
      `الخامة المعتمدة: ستانلس ستيل 304 غذائي (AISI 304 - 1.2 مم إلى 1.5 مم)`,
      `إجمالي طول الأرفف: ${totalShelfLinearM} م · إجمالي الكوابيل: ${totalBrackets} كابولي`,
      `==================================================\n`,
      `[أولاً: أرفف الحوائط الستانلس (Wall Shelves)]`,
      ...stainlessShelves.map((s, idx) => {
        const brackets =
          s.bracketCount || (s.widthCm > 300 ? 5 : s.widthCm > 180 ? 3 : 2);
        return `${idx + 1}. [${s.code || `SH-${idx + 1}`}] ${s.nameAr}\n   - المقاس: ${s.widthCm} سم طول × ${s.depthCm} سم عمق × ${s.heightCm} سم سمك\n   - منسوب الارتفاع من الأرضية: ${s.yCm} سم\n   - الكوابيل: ${brackets} كابولي ستانلس 2.5×2.5 سم\n   - الملاحظات: ${s.fabricationNotesAr || 'شفة أمان أمامية 1.5 سم + شفة خلفية 2 سم'}\n`;
      }),
      `\n[ثانياً: بارات ومكاتب العمل والتحضير (Stainless Counters)]`,
      ...stainlessBars.map((b, idx) => {
        return `${idx + 1}. [${b.code || `BAR-${idx + 1}`}] ${b.nameAr}\n   - المقاس: ${b.widthCm} سم طول × ${b.depthCm} سم عمق × ${b.heightCm} سم ارتفاع\n   - الملاحظات: ${b.fabricationNotesAr || 'قرصة ستانلس 304 سمك 1.5 مم مع تصفيح كونتر سفلي'}\n`;
      }),
      `==================================================`,
      `ملاحظة هامة للصنايعي: تؤخذ الشرب والمقاسات على الطبيعة قبل التثبيت النهائي للتأكد من زوايا الحوائط القائمة.`,
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-4xl bg-[#10141d] border border-amber-500/35 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-amber-500/15 via-black/40 to-black/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-100">
                  {isAr
                    ? 'كشف مقاسات وتفصيل الستانلس ستيل (نسخة الورشة والصنايعي)'
                    : 'Stainless Steel Workshop Fabrication Cut-List'}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs border border-amber-400/30 font-bold">
                  عماد أفندي
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {isAr
                  ? `أبعاد المكان: ${(room.widthCm / 100).toFixed(2)} م عرض × ${(room.depthCm / 100).toFixed(2)} م عمق × ${(room.heightCm / 100).toFixed(2)} م ارتفاع`
                  : `Room: ${(room.widthCm / 100).toFixed(2)}m × ${(room.depthCm / 100).toFixed(2)}m × ${(room.heightCm / 100).toFixed(2)}m`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
              title={isAr ? 'طباعة كشف المقاسات A4 أو حفظه PDF' : 'Print A4 or Save PDF'}
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة / حفظ PDF' : 'Print / PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAll}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 text-xs font-medium flex items-center gap-1.5 border border-white/10 transition-colors"
              title={isAr ? 'نسخ الكشف بالكامل للواتساب' : 'Copy All'}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : isAr ? 'نسخ للواتساب' : 'Copy All'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Technical Summary KPI Cards */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-black/40 border-b border-white/10 text-xs">
          <div className="p-2.5 rounded-xl bg-[#141923] border border-white/8">
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5 text-amber-400" />
              {isAr ? 'إجمالي أمتار الرفوف' : 'Total Shelf Length'}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-amber-300">
                {totalShelfLinearM}
              </span>
              <span className="text-[11px] text-stone-400">{isAr ? 'متر طولي' : 'meters'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#141923] border border-white/8">
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              {isAr ? 'كوابيل التثبيت المطلوبة' : 'Total Wall Brackets'}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-amber-300">
                {totalBrackets}
              </span>
              <span className="text-[11px] text-stone-400">{isAr ? 'كابولي ستانلس' : 'brackets'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#141923] border border-white/8">
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              {isAr ? 'إجمالي أطوال البارات' : 'Total Bar Length'}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-stone-200">
                {totalBarLinearM}
              </span>
              <span className="text-[11px] text-stone-400">{isAr ? 'متر طولي' : 'meters'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#141923] border border-white/8">
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {isAr ? 'نوع الستانلس المعتمد' : 'Grade Spec'}
            </span>
            <div className="mt-1">
              <span className="text-xs font-bold text-stone-100 block">
                AISI 304 Food-Grade
              </span>
              <span className="text-[10px] text-stone-400">{isAr ? 'سمك 1.2 مم إلى 1.5 مم' : '1.2mm - 1.5mm'}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Tables Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 thin-scroll print-area">
          {/* SECTION 1: STAINLESS SHELVES */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-bold text-amber-300">
                {isAr
                  ? 'أولاً: أرفف الحوائط الستانلس ستيل (استبدال الأرفف الخشب بالكامل)'
                  : '1. Wall-Mounted Stainless Steel Shelving (Replacing Wooden Shelves)'}
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25">
              <table className="w-full text-xs text-right border-collapse" dir={isAr ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-stone-300 font-semibold">
                    <th className="p-2.5 text-center w-12">#</th>
                    <th className="p-2.5 text-center w-18">{isAr ? 'الكود' : 'Code'}</th>
                    <th className="p-2.5">{isAr ? 'بيان الرف ومكانه' : 'Shelf Description'}</th>
                    <th className="p-2.5 text-center">{isAr ? 'الطول' : 'Length'}</th>
                    <th className="p-2.5 text-center">{isAr ? 'العمق' : 'Depth'}</th>
                    <th className="p-2.5 text-center">{isAr ? 'السمك' : 'Height'}</th>
                    <th className="p-2.5 text-center font-bold text-amber-300 bg-amber-500/10">
                      {isAr ? 'المنسوب من الأرض' : 'Elevation'}
                    </th>
                    <th className="p-2.5 text-center">{isAr ? 'الكوابيل' : 'Brackets'}</th>
                    <th className="p-2.5">{isAr ? 'مواصفات الثني والتركيب' : 'Fabrication Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-stone-200">
                  {stainlessShelves.map((shelf, idx) => {
                    const brackets =
                      shelf.bracketCount ||
                      (shelf.widthCm > 300 ? 5 : shelf.widthCm > 180 ? 3 : 2);
                    return (
                      <tr
                        key={shelf.id}
                        onClick={() => {
                          onSelectItem(shelf.id);
                          onClose();
                        }}
                        className="hover:bg-amber-500/10 cursor-pointer transition-colors"
                      >
                        <td className="p-2.5 text-center font-mono text-stone-400">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-amber-400">
                          {shelf.code || `SH-${idx + 1}`}
                        </td>
                        <td className="p-2.5 font-medium text-stone-100">
                          {isAr ? shelf.nameAr : shelf.nameEn}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-amber-300">
                          {shelf.widthCm} سم
                        </td>
                        <td className="p-2.5 text-center font-mono text-stone-300">
                          {shelf.depthCm} سم
                        </td>
                        <td className="p-2.5 text-center font-mono text-stone-400">
                          {shelf.heightCm} سم
                        </td>
                        <td className="p-2.5 text-center font-mono font-extrabold text-amber-300 bg-amber-500/10">
                          {shelf.yCm} سم
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {brackets} كابولي
                        </td>
                        <td className="p-2.5 text-[11px] text-stone-300">
                          {shelf.fabricationNotesAr ||
                            'شفة أمان أمامية 1.5 سم لمنع سقوط الزجاجات + شفة خلفية 2 سم'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: STAINLESS COUNTERS / BARS */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <h3 className="text-sm font-bold text-sky-300">
                {isAr
                  ? 'ثانياً: بارات التحضير والعمل الستانلس ستيل'
                  : '2. Stainless Steel Prep Counters & Bars'}
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25">
              <table className="w-full text-xs text-right border-collapse" dir={isAr ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-stone-300 font-semibold">
                    <th className="p-2.5 text-center w-12">#</th>
                    <th className="p-2.5 text-center w-18">{isAr ? 'الكود' : 'Code'}</th>
                    <th className="p-2.5">{isAr ? 'بيان البار والموقع' : 'Counter Description'}</th>
                    <th className="p-2.5 text-center">{isAr ? 'الطول' : 'Length'}</th>
                    <th className="p-2.5 text-center">{isAr ? 'العمق' : 'Depth'}</th>
                    <th className="p-2.5 text-center">{isAr ? 'الارتفاع' : 'Height'}</th>
                    <th className="p-2.5">{isAr ? 'مواصفات التصنيع والهيكل' : 'Fabrication Details'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-stone-200">
                  {stainlessBars.map((bar, idx) => (
                    <tr
                      key={bar.id}
                      onClick={() => {
                        onSelectItem(bar.id);
                        onClose();
                      }}
                      className="hover:bg-sky-500/10 cursor-pointer transition-colors"
                    >
                      <td className="p-2.5 text-center font-mono text-stone-400">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-sky-400">
                        {bar.code || `BAR-${idx + 1}`}
                      </td>
                      <td className="p-2.5 font-medium text-stone-100">
                        {isAr ? bar.nameAr : bar.nameEn}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-sky-300">
                        {bar.widthCm} سم
                      </td>
                      <td className="p-2.5 text-center font-mono text-stone-300">
                        {bar.depthCm} سم
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-stone-200">
                        {bar.heightCm} سم
                      </td>
                      <td className="p-2.5 text-[11px] text-stone-300">
                        {bar.fabricationNotesAr ||
                          'قرصة صاج ستانلس 304 سمك 1.5 مم مصفحة بكونتر 18 مم سفلي + شاسيه علب 40×40 مم وأرجل رجلاش'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workshop Technical Guidelines & Installation Rules */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/25 text-xs text-stone-300 space-y-1.5">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {isAr ? 'تعليمات وإرشادات هامة لفني الورشة والتركيب:' : 'Important Fabricator Guidelines:'}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-300 leading-relaxed">
              <li>
                <strong>أخذ الشرب على الطبيعة:</strong> مراجعة استقامة الجدران الخرسانية والبلاط وتحديد خط الليزر (المنسوب الأفقي) قبل التثبيت.
              </li>
              <li>
                <strong>خامة الأرفف:</strong> صاج ستانلس ستيل مطفي AISI 304 معتمد للأغذية والمشروبات (مقاوم تماماً لأحماض الليمون والسيرب والماء).
              </li>
              <li>
                <strong>تنية الأمان الأمامية:</strong> ثني حافة أمامية مقلوبة للأعلى بارتفاع 15 مم لجميع أرفف الصوصات والسيرب لمنع انزلاق الزجاجات أثناء الحركة والاهتزاز.
              </li>
              <li>
                <strong>كوابيل التثبيت:</strong> تثبيت كوابيل مثلثة من العلب الستانلس 25×25 مم أو خوص محملة 3 مم كل 80 إلى 90 سم بمسامير فيشر صلب 10 مم.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/50 flex items-center justify-between text-xs text-stone-400">
          <span>
            {isAr
              ? 'كافيه عماد أفندي · قسم التحضير والبار · تصميم وتنفيذ 2026'
              : 'Emad Afandi Cafe · Prep & Bar Area · 2026'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 font-medium transition-colors"
          >
            {isAr ? 'إغلاق الكشف' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
