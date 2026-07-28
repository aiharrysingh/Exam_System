import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  /** When set, the user must type this exact string to enable confirm. */
  requireTyped?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  tone = "danger",
  loading,
  requireTyped,
}: Props) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const blocked = !!requireTyped && typed.trim() !== requireTyped;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={blocked} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body && <div className="text-sm text-fg-secondary">{body}</div>}
      {requireTyped && (
        <label className="mt-4 flex flex-col gap-1.5 text-xs font-medium text-fg-muted">
          Type <span className="font-semibold text-fg">{requireTyped}</span> to confirm
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-fg outline-none focus:border-brand-500"
          />
        </label>
      )}
    </Modal>
  );
}
