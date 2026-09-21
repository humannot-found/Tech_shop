import { FormEvent, useState } from "react";

import type { DiscountApprovalPayload } from "../../api/types";
import { money } from "./utils";

type SupervisorApprovalModalProps = {
  discount: number;
  onApprove: (approval: DiscountApprovalPayload) => void;
  onCancel: () => void;
};

export function SupervisorApprovalModal({
  discount,
  onApprove,
  onCancel,
}: SupervisorApprovalModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    onApprove({ username: username.trim(), password });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="supervisor-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Supervisor approval"
        onSubmit={handleSubmit}
      >
        <header>
          <p className="eyebrow">Supervisor approval</p>
          <h2>Approve {money(discount)} discount</h2>
          <span>
            A manager or admin must enter their own login to allow this
            discount. The approval is recorded against the sale.
          </span>
        </header>
        <label>
          Supervisor username
          <input
            autoFocus
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          Supervisor password
          <input
            type="password"
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div className="table-actions">
          <button
            className="success-button"
            disabled={!username.trim() || !password}
          >
            Approve discount
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
