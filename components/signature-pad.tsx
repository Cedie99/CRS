"use client";

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from "react";
import { Button } from "@/components/ui/button";

export interface SignaturePadRef {
  clear: () => void;
  toDataURL: () => string;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  onChange?: (isEmpty: boolean) => void;
  disabled?: boolean;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  function SignaturePad({ onChange, disabled }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const emptyRef = useRef(true);
    const [showPlaceholder, setShowPlaceholder] = useState(true);

    const getPos = (
      e: MouseEvent | TouchEvent,
      canvas: HTMLCanvasElement
    ): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        const touch = e.touches[0];
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    // Lazily get a styled ctx — re-applies styles so they survive canvas resets.
    const getDrawCtx = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.width === 0) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      return ctx;
    }, []);

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      emptyRef.current = true;
      setShowPlaceholder(true);
      onChange?.(true);
    }, [onChange]);

    useImperativeHandle(ref, () => ({
      clear,
      toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
      isEmpty: () => emptyRef.current,
    }));

    // ── Canvas sizing ──────────────────────────────────────────────────────────
    // Uses ResizeObserver so the canvas is correctly sized even when it starts
    // inside a hidden (display:none) step and becomes visible later.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const initCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0) return;
        const dpr = window.devicePixelRatio || 1;
        const newW = Math.round(rect.width * dpr);
        const newH = Math.round(rect.height * dpr);
        // Skip if dimensions haven't changed (avoids clearing a drawn signature
        // on minor layout shifts or repeated observer callbacks).
        if (canvas.width === newW && canvas.height === newH) return;
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
      };

      const observer = new ResizeObserver(initCanvas);
      observer.observe(canvas);
      initCanvas(); // Immediate attempt (works when canvas is already visible)

      return () => observer.disconnect();
    }, []);

    // ── Drawing event listeners ────────────────────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const onStart = (e: MouseEvent | TouchEvent) => {
        if (disabled) return;
        e.preventDefault();
        isDrawing.current = true;
        const ctx = getDrawCtx();
        if (!ctx) return;
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };

      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current || disabled) return;
        e.preventDefault();
        const ctx = getDrawCtx();
        if (!ctx) return;
        const pos = getPos(e, canvas);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        if (emptyRef.current) {
          emptyRef.current = false;
          setShowPlaceholder(false);
          onChange?.(false);
        }
      };

      const onEnd = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
      };

      canvas.addEventListener("mousedown", onStart);
      canvas.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
      canvas.addEventListener("touchstart", onStart, { passive: false });
      canvas.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);

      return () => {
        canvas.removeEventListener("mousedown", onStart);
        canvas.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onEnd);
        canvas.removeEventListener("touchstart", onStart);
        canvas.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
    }, [disabled, getDrawCtx, onChange]);

    return (
      <div className="space-y-2">
        <div className="relative rounded-md border border-zinc-300 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="block w-full touch-none"
            style={{ height: 160, cursor: disabled ? "not-allowed" : "crosshair" }}
          />
          {showPlaceholder && (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-300 select-none"
              aria-hidden="true"
            >
              Sign here
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={disabled}
        >
          Clear
        </Button>
      </div>
    );
  }
);
