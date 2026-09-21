import { FormEvent, useState } from "react";

import type { PosSale } from "../../api/types";
import { money } from "./utils";

type VoidModalProps = {
  sale: PosSale;
  busy: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
};

export function VoidModal({ sale, busy, onSubmit, onClose }: VoidModalProps) {
  const [reason, setReason] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length >= 3) onSubmit(reason.trim());
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="supervisor-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Void sale"
        onSubmit={handleSubmit}
      >
        <header>
          <p className="eyebrow">Void sale</p>
          <h2>
            {sale.invoice_number} / {money(Number(sale.total_amount))}
          </h2>
          <span>
            A void cancels the whole sale and refunds what was paid. A manager
            has to approve it. Use a return instead for a single item.
          </span>
        </header>
        <label>
          Reason
          <input
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this sale being voided?"
          />
        </label>
        <div className="table-actions">
          <button
            className="danger-button"
            disabled={busy || reason.trim().length < 3}
          >
            {busy ? "Sending..." : "Request void"}
          </button>
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
