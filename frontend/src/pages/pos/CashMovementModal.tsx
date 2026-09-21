import { FormEvent, useState } from "react";

import type { TillCashMovement } from "../../api/types";
import { dateLabel } from "../../utils/format";
import { money } from "./utils";

type MovementKind = TillCashMovement["kind"];

const kindOptions: Array<{ value: MovementKind; label: string; hint: string }> = [
  { value: "paid_out", label: "Paid out", hint: "Cash spent from the till, e.g. supplies or fuel" },
  { value: "cash_drop", label: "Cash drop", hint: "Cash moved to the safe or the manager" },
  { value: "cash_in", label: "Cash in", hint: "Cash added to the till, e.g. extra change" },
];

export function kindLabel(kind: MovementKind) {
  return kindOptions.find((option) => option.value === kind)?.label ?? kind;
}

type CashMovementModalProps = {
  movements: TillCashMovement[];
  busy: boolean;
  onSubmit: (kind: MovementKind, amount: number, reason: string) => Promise<boolean>;
  onClose: () => void;
};

export function CashMovementModal({
  movements,
  busy,
  onSubmit,
  onClose,
}: CashMovementModalProps) {
  const [kind, setKind] = useState<MovementKind>("paid_out");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const value = Number(amount);
  const canSubmit = !busy && value > 0 && reason.trim().length >= 3;
  const hint = kindOptions.find((option) => option.value === kind)?.hint;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    if (await onSubmit(kind, value, reason.trim())) {
      setAmount("");
      setReason("");
    }
  }

  const totals = movements.reduce(
    (result, item) => ({
      ...result,
      [item.kind]: result[item.kind] + Number(item.amount),
    }),
    { cash_in: 0, paid_out: 0, cash_drop: 0 } as Record<MovementKind, number>,
  );

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="supervisor-modal cash-movement-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Cash in and out"
      >
        <header>
          <p className="eyebrow">Till cash</p>
          <h2>Cash in / out</h2>
          <span>
            Record any cash that enters or leaves the drawer outside of sales,
            so the till balances when you close it.
          </span>
        </header>

        <form className="cash-movement-form" onSubmit={handleSubmit}>
          <div className="cash-movement-kinds" role="group" aria-label="Type">
            {kindOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={kind === option.value ? "is-active" : ""}
                onClick={() => setKind(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <small>{hint}</small>
          <label>
            Amount (KES)
            <input
              type="number"
              min="0"
              step="any"
              autoFocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label>
            Reason
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="What is this for?"
            />
          </label>
          <div className="table-actions">
            <button className="success-button" disabled={!canSubmit}>
              {busy ? "Saving..." : `Record ${kindLabel(kind).toLowerCase()}`}
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </form>

        <div className="cash-movement-totals">
          <span>
            Paid out <strong>{money(totals.paid_out)}</strong>
          </span>
          <span>
            Dropped <strong>{money(totals.cash_drop)}</strong>
          </span>
          <span>
            Cash in <strong>{money(totals.cash_in)}</strong>
          </span>
        </div>

        <div className="cash-movement-list">
          {movements.length === 0 && <span>No cash movements in this session yet.</span>}
          {movements.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{kindLabel(item.kind)}</strong>
                <span>{item.reason}</span>
                <small>{dateLabel(item.created_at)}</small>
              </div>
              <strong>{money(Number(item.amount))}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
