"use client";

import { useEffect } from "react";

const PX_PER_MM = 96 / 25.4;
const PAGE_HEIGHT_MM = 297;
const PAGE_MARGIN_TOP_MM = 10;
const PAGE_MARGIN_BOTTOM_MM = 10;
const PRINTABLE_HEIGHT_PX = (PAGE_HEIGHT_MM - PAGE_MARGIN_TOP_MM - PAGE_MARGIN_BOTTOM_MM) * PX_PER_MM;
const DEFAULT_IMAGE_HEIGHT_MM = 160;
const MIN_IMAGE_HEIGHT_MM = 90;
const BLOCK_SAFETY_PX = 12;

function optimizePrintLayout() {
  const root = document.querySelector<HTMLElement>("[data-print-root]");
  if (!root) return;

  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>("[data-print-file-block]")
  );

  const rootTop = root.getBoundingClientRect().top + window.scrollY;

  for (const block of blocks) {
    block.style.breakBefore = "auto";
    block.style.pageBreakBefore = "auto";

    const imageFrame = block.querySelector<HTMLElement>("[data-print-file-image-frame]");
    if (imageFrame) {
      imageFrame.style.height = `${DEFAULT_IMAGE_HEIGHT_MM}mm`;
    }
  }

  for (const block of blocks) {
    const imageFrame = block.querySelector<HTMLElement>("[data-print-file-image-frame]");
    if (imageFrame) {
      const currentHeight = imageFrame.getBoundingClientRect().height;
      const blockHeight = block.getBoundingClientRect().height;
      const nonImageHeight = Math.max(0, blockHeight - currentHeight);
      const maxImageHeightPx = Math.max(
        MIN_IMAGE_HEIGHT_MM * PX_PER_MM,
        PRINTABLE_HEIGHT_PX - nonImageHeight - BLOCK_SAFETY_PX
      );
      const targetHeightPx = Math.min(DEFAULT_IMAGE_HEIGHT_MM * PX_PER_MM, maxImageHeightPx);
      imageFrame.style.height = `${targetHeightPx / PX_PER_MM}mm`;
    }

    const blockTop = block.getBoundingClientRect().top + window.scrollY - rootTop;
    const blockHeight = block.getBoundingClientRect().height;
    const usedOnPage = ((blockTop % PRINTABLE_HEIGHT_PX) + PRINTABLE_HEIGHT_PX) % PRINTABLE_HEIGHT_PX;
    const remainingOnPage = PRINTABLE_HEIGHT_PX - usedOnPage;

    if (blockHeight + BLOCK_SAFETY_PX > remainingOnPage && usedOnPage > 0) {
      block.style.breakBefore = "page";
      block.style.pageBreakBefore = "always";
    }
  }
}

export function PrintLayoutOptimizer() {
  useEffect(() => {
    let rafId = 0;

    const run = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        optimizePrintLayout();
      });
    };

    const mediaQuery = window.matchMedia("print");
    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        run();
      }
    };

    window.addEventListener("beforeprint", run);
    window.addEventListener("afterprint", run);
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("beforeprint", run);
      window.removeEventListener("afterprint", run);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  return null;
}
