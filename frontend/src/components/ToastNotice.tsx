import { useEffect, useMemo } from "react";

type ToastTone = "success" | "warning" | "danger" | "info";

type ToastNoticeProps = {
  message: string | null;
  onClose: () => void;
  autoHideMs?: number;
  tone?: ToastTone;
};

const successWords = [
  "added",
  "approved",
  "assigned",
  "collected",
  "completed",
  "created",
  "generated",
  "logged",
  "opened",
  "posted",
  "preview",
  "ready",
  "received",
  "removed",
  "saved",
  "submitted",
  "updated",
];

const dangerWords = [
  "cannot",
  "could not",
  "declined",
  "duplicate",
  "failed",
  "invalid",
  "must",
  "required",
  "timed out",
  "unavailable",
];

const warningWords = [
  "approval",
  "ask",
  "before",
  "empty",
  "enter",
  "missing",
  "no ",
  "not ",
  "only",
  "select",
];

function inferTone(message: string): ToastTone {
  const text = message.toLowerCase();

  if (dangerWords.some((word) => text.includes(word))) return "danger";
  if (warningWords.some((word) => text.includes(word))) return "warning";
  if (successWords.some((word) => text.includes(word))) return "success";

  return "info";
}

export function ToastNotice({
  message,
  onClose,
  autoHideMs = 6500,
  tone,
}: ToastNoticeProps) {
  const resolvedTone = useMemo(
    () => (message ? tone ?? inferTone(message) : "info"),
    [message, tone],
  );

  useEffect(() => {
    if (!message || autoHideMs <= 0) return undefined;

    const timer = window.setTimeout(onClose, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [autoHideMs, message, onClose]);

  if (!message) return null;

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      <div className={`toast-notice toast-notice--${resolvedTone}`}>
        <span className="toast-notice__dot" aria-hidden="true" />
        <p>{message}</p>
        <button type="button" onClick={onClose} aria-label="Dismiss notification">
          ×
        </button>
      </div>
    </div>
  );
}
