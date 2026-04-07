"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Camera, RefreshCw, FileText, Trash2, Pencil, Check } from "lucide-react";
import {
  docTypeRequiresExpiration,
  getFileExpirationStatus,
  sortFilesByUploadedAtDesc,
  type DocType,
  type FileEntry,
} from "@/lib/doc-types";

function formatUploadedAt(value?: string) {
  if (!value) return "Uploaded date unavailable";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Uploaded date unavailable";
  return `Uploaded ${new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatExpiration(value?: string) {
  if (!value) return "No expiration date recorded";
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return "Invalid expiration date";
  return `Expires ${new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function expirationStatusLabel(file: FileEntry) {
  const status = getFileExpirationStatus(file);
  if (status === "valid") return "valid";
  if (status === "expired") return "expired";
  return "unknown";
}

function ExpirationStatusBadge({ status }: { status: "valid" | "expired" | "unknown" }) {
  if (status === "expired") {
    return (
      <span className="inline-flex items-center rounded-md border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-800">
        Expired - Reupload Required
      </span>
    );
  }

  if (status === "valid") {
    return (
      <span className="inline-flex items-center rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
        Valid
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
      Unknown
    </span>
  );
}

function FileRow({
  file,
  docType,
  endpoint,
  disabled,
  allowRename,
  allowDelete,
  onRemove,
  onRename,
}: {
  file: FileEntry;
  docType: DocType;
  endpoint: string;
  disabled: boolean;
  allowRename: boolean;
  allowDelete: boolean;
  onRemove: () => void;
  onRename: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(file.name);
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(file.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitRename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === file.name) {
      setEditing(false);
      return;
    }
    setRenaming(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, url: file.url, newName: trimmed }),
      });
      if (!res.ok) return;
      onRename(trimmed);
    } catch {
      // Keep UI unchanged on request errors.
    }
    setRenaming(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitRename();
    }
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-1.5">
      <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { void commitRename(); }}
          onKeyDown={handleKeyDown}
          disabled={renaming}
          className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs text-zinc-700 outline-none focus:border-zinc-500"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-xs text-zinc-700">{file.name}</span>
      )}
      <span className="shrink-0 text-[10px] text-zinc-400">{(file.size / 1024).toFixed(0)} KB</span>
      {allowRename && (
        editing ? (
          <button
            type="button"
            onClick={() => { void commitRename(); }}
            disabled={renaming || disabled}
            className="shrink-0 text-zinc-400 hover:text-zinc-700 disabled:opacity-40"
          >
            {renaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            disabled={disabled}
            className="shrink-0 text-zinc-400 hover:text-zinc-700 disabled:opacity-40"
            title="Rename file"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )
      )}
      {allowDelete && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled || editing}
          className="shrink-0 text-zinc-400 hover:text-red-500 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function DocUploadSlot({
  docType,
  label,
  endpoint,
  files,
  onChange,
  disabled,
  allowRename = true,
  allowDelete = true,
}: {
  docType: DocType;
  label: string;
  endpoint: string;
  files: FileEntry[];
  onChange: (files: FileEntry[]) => void;
  disabled: boolean;
  allowRename?: boolean;
  allowDelete?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const requiresExpiration = docTypeRequiresExpiration(docType);
  const sortedFiles = sortFilesByUploadedAtDesc(files);

  function stopCameraStream() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  async function uploadSingleFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docType", docType);
    if (requiresExpiration) fd.append("expirationDate", expirationDate);

    const res = await fetch(endpoint, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Upload failed");
    }
    return json as FileEntry;
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError("");
    setUploading(true);
    const results: FileEntry[] = [];

    if (requiresExpiration && !expirationDate) {
      setError("Expiration date is required for this document type.");
      setUploading(false);
      return;
    }

    for (const file of Array.from(fileList)) {
      try {
        const uploaded = await uploadSingleFile(file);
        results.push(uploaded);
      } catch {
        setError("Upload failed. Please try again.");
        break;
      }
    }

    if (results.length) onChange(sortFilesByUploadedAtDesc([...files, ...results]));
    if (results.length && requiresExpiration) setExpirationDate("");
    setUploading(false);
  }

  async function startCamera(facing: "environment" | "user") {
    setCameraError("");
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    stopCameraStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setCameraFacing(facing);

      setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {
          setCameraError("Unable to start camera preview.");
        });
      }, 0);
    } catch {
      cameraInputRef.current?.click();
    }
  }

  async function openCamera() {
    await startCamera(cameraFacing);
  }

  async function switchCamera() {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    await startCamera(nextFacing);
  }

  function closeCamera() {
    setCameraOpen(false);
    setCameraError("");
    stopCameraStream();
  }

  async function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setCameraError("Camera is not ready yet. Please try again.");
      return;
    }

    if (requiresExpiration && !expirationDate) {
      setError("Expiration date is required for this document type.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Unable to capture photo.");
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Unable to capture photo.");
      return;
    }

    setUploading(true);
    try {
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      const uploaded = await uploadSingleFile(file);
      onChange(sortFilesByUploadedAtDesc([...files, uploaded]));
      if (requiresExpiration) setExpirationDate("");
      closeCamera();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(file: FileEntry) {
    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, url: file.url }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Delete failed");
        return;
      }
      onChange(sortFilesByUploadedAtDesc(files.filter((f) => f.url !== file.url)));
    } catch {
      setError("Delete failed. Please try again.");
    }
  }

  function handleRename(file: FileEntry, newName: string) {
    onChange(sortFilesByUploadedAtDesc(files.map((f) => (f.url === file.url ? { ...f, name: newName } : f))));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        <div className="flex items-center gap-2">
          {requiresExpiration && (
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              disabled={disabled || uploading}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
              aria-label={`${label} expiration date`}
            />
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Upload
          </button>
          <button
            type="button"
            onClick={() => {
              void openCamera();
            }}
            disabled={disabled || uploading}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            Take Photo
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => { void handleFiles(e.target.files); }}
          onClick={(e) => {
            (e.target as HTMLInputElement).value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          multiple
          accept="image/*"
          capture={cameraFacing}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            void handleFiles(e.target.files);
          }}
          onClick={(e) => {
            (e.target as HTMLInputElement).value = "";
          }}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {cameraOpen && (
        <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-medium text-zinc-600">Camera preview</p>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-md border border-zinc-200 bg-black"
          />
          {cameraError && <p className="text-xs text-red-600">{cameraError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void capturePhoto();
              }}
              disabled={disabled || uploading}
              className="rounded-md border border-[#2d6e1e] bg-[#2d6e1e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#245919] disabled:opacity-50"
            >
              Capture Photo
            </button>
            <button
              type="button"
              onClick={() => {
                void switchCamera();
              }}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              Switch Camera
            </button>
            <button
              type="button"
              onClick={closeCamera}
              disabled={uploading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sortedFiles.length > 0 && (
        <div className="space-y-1.5">
          {sortedFiles.map((f) => (
            <div key={f.url} className="space-y-1">
              <FileRow
                file={f}
                docType={docType}
                endpoint={endpoint}
                disabled={disabled}
                allowRename={allowRename}
                allowDelete={allowDelete}
                onRemove={() => { void handleRemove(f); }}
                onRename={(newName) => handleRename(f, newName)}
              />
                <div className="pl-1 text-[10px] text-zinc-400">
                  <p>{formatUploadedAt(f.uploadedAt)}</p>
                  <p>{formatExpiration(f.expirationDate)}</p>
                  {requiresExpiration && (
                    <div className="mt-0.5">
                      <ExpirationStatusBadge status={expirationStatusLabel(f)} />
                    </div>
                  )}
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
