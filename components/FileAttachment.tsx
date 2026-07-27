"use client";

import * as React from "react";
import { XIcon, UploadIcon, ImageIcon } from "lucide-react";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
} from "@/components/ui/attachment";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileAttachment({
  file,
  onFileChange,
  accept = "image/*",
  capture,
  idleLabel = "Datei auswählen",
  idleHint,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  capture?: boolean | "user" | "environment";
  idleLabel?: string;
  idleHint?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick() {
    inputRef.current?.click();
  }
  function clear() {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <Attachment state="done" className="w-full">
          <AttachmentMedia variant="image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="" /> : <ImageIcon />}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>
              {formatBytes(file.size)} · zum Ersetzen tippen
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              type="button"
              onClick={clear}
              aria-label="Entfernen"
            >
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
          <AttachmentTrigger onClick={pick} aria-label="Datei ersetzen" />
        </Attachment>
      ) : (
        <Attachment state="idle" className="w-full">
          <AttachmentMedia>
            <UploadIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{idleLabel}</AttachmentTitle>
            {idleHint ? (
              <AttachmentDescription>{idleHint}</AttachmentDescription>
            ) : null}
          </AttachmentContent>
          <AttachmentTrigger onClick={pick} aria-label={idleLabel} />
        </Attachment>
      )}
    </>
  );
}
