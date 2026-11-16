import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Lang, ReferencePhoto } from '../scene/types';

interface PhotosGalleryModalProps {
  photos: ReferencePhoto[];
  activeIndex: number | null;
  lang: Lang;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

export function PhotosGalleryModal({
  photos,
  activeIndex,
  lang,
  onClose,
  onChangeIndex,
}: PhotosGalleryModalProps) {
  if (activeIndex === null) return null;
  const photo = photos[activeIndex];
  if (!photo) return null;

  const isAr = lang === 'ar';

  const prev = () => onChangeIndex((activeIndex - 1 + photos.length) % photos.length);
  const next = () => onChangeIndex((activeIndex + 1) % photos.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? 'معرض صور المكان الأصلية' : 'Original Site Photos'}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-3xl bg-[#141820] border border-white/12 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-100">
            <span className="font-mono-nums text-amber-400">
              {activeIndex + 1} / {photos.length}
            </span>
            <span className="text-stone-500" aria-hidden="true">
              ·
            </span>
            <span>{isAr ? photo.labelAr : photo.labelEn}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق الصورة' : 'Close photo'}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-[#0b0d12] flex items-center justify-center h-[64vh]">
          <img
            src={photo.src}
            alt={isAr ? photo.labelAr : photo.labelEn}
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain"
          />

          <button
            type="button"
            onClick={isAr ? next : prev}
            aria-label={isAr ? 'الصورة السابقة' : 'Previous photo'}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 border border-white/15 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={isAr ? prev : next}
            aria-label={isAr ? 'الصورة التالية' : 'Next photo'}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 border border-white/15 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
