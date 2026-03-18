"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxPhoto {
  id: string;
  url: string;
  alt: string;
}

interface PhotoLightboxProps {
  /** 照片列表，用於左右瀏覽 */
  photos: LightboxPhoto[];
  /** 初始顯示的照片索引 */
  initialIndex: number;
  /** 關閉 lightbox 時呼叫 */
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

/**
 * PhotoLightbox：全螢幕照片檢視器
 * - 點擊照片可查看原圖
 * - 支援左右滑動、鍵盤方向鍵、左右按鈕瀏覽
 * - 點擊背景或按 ESC 關閉
 */
export function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const photo = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(photos.length - 1, i + 1));
  }, [photos.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    },
    [onClose, goPrev, goNext]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!photo) return null;

  const lightbox = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-paper/80 transition hover:bg-paper/20 hover:text-paper"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-paper/80 transition hover:bg-paper/20 hover:text-paper sm:left-4"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-paper/80 transition hover:bg-paper/20 hover:text-paper sm:right-4"
          aria-label="Next photo"
        >
          <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10" />
        </button>
      )}

      <div
        className="flex w-full max-w-[95vw] flex-1 items-center justify-center p-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={photo.url}
          alt={photo.alt}
          className="mx-auto max-h-[90vh] max-w-full object-contain"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-paper/70">
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(lightbox, document.body) : null;
}
