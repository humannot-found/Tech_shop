import { FormEvent, useState } from "react";

import type { PosSale, SaleReturn } from "../../api/types";
import { money, restockableConditions, returnConditions } from "./utils";

type ReturnModalProps = {
  sale: PosSale;
  history: SaleReturn[];
  busy: boolean;
  onSubmit: (
    items: Array<{
      sale_item_id: string;
      quantity: number;
      condition: string;
      restock: boolean;
    }>,
    reason: string,
  ) => void;
  onClose: () => void;
};

type LineState = { quantity: string; condition: string; restock: boolean };

export function ReturnModal({
  sale,
  history,
  busy,
  onSubmit,
  onClose,
}: ReturnModalProps) {
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<Record<string, LineState>>({});

  const alreadyReturned: Record<string, number> = {};
  for (const item of history) {
    if (item.status !== "pending" && item.status !== "approved") continue;
    for (const line of item.items) {
      alreadyReturned[line.sale_item_id] =
        (alreadyReturned[line.sale_item_id] ?? 0) + line.quantity;
    }
  }

  function lineFor(id: string): LineState {
    return lines[id] ?? { quantity: "", condition: "good", restock: false };
  }

  function update(id: string, patch: Partial<LineState>) {
    setLines((current) => ({ ...current, [id]: { ...lineFor(id), ...patch } }));
  }

  const chosen = sale.items
    .map((item) => ({ item, line: lineFor(item.id) }))
    .filter(({ line }) => Number(line.quantity) > 0);
  const refundEstimate = chosen.reduce(
    (total, { item, line }) =>
      total + (Number(item.line_total) / item.quantity) * Number(line.quantity),
    0,
  );
  const canSubmit = chosen.length > 0 && reason.trim().length >= 3 && !busy;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit(
      chosen.map(({ item, line }) => ({
        sale_item_id: item.id,
        quantity: Number(line.quantity),
        condition: line.condition,
        restock: line.restock && restockableConditions.includes(line.condition),
      })),
      reason.trim(),
    );
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="supervisor-modal return-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Return items"
        onSubmit={handleSubmit}
      >
        <header>
          <p className="eyebrow">Return items</p>
          <h2>{sale.invoice_number}</h2>
          <span>
            Choose what the customer is bringing back. A manager approves the
            refund before any money or stock moves.
          </span>
        </header>

        <div className="return-lines">
          {sale.items.map((item) => {
            const remaining = item.quantity - (alreadyReturned[item.id] ?? 0);
            const line = lineFor(item.id);
            const canRestock = restockableConditions.includes(line.condition);
            return (
              <article className="return-line" key={item.id}>
                <div>
                  <strong>{item.description}</strong>
                  <span>
                    Sold {item.quantity} at {money(Number(item.unit_price))}
                    {remaining < item.quantity
                      ? ` / ${remaining} still returnable`
                      : ""}
                  </span>
                </div>
                {remaining > 0 ? (
                  <div className="return-line__fields">
                    <label>
                      Qty
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={line.quantity}
                        onChange={(event) =>
                          update(item.id, { quantity: event.target.value })
                        }
                        placeholder="0"
                      />
                    </label>
                    <label>
                      Condition
                      <select
                        value={line.condition}
                        onChange={(event) =>
                          update(item.id, {
                            condition: event.target.value,
                            restock: restockableConditions.includes(event.target.value)
                              ? line.restock
                              : false,
                          })
                        }
                      >
                        {returnConditions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="return-line__restock">
                      <input
                        type="checkbox"
                        disabled={!canRestock}
                        checked={line.restock && canRestock}
                        onChange={(event) =>
                          update(item.id, { restock: event.target.checked })
                        }
                      />
                      Put back in stock
                    </label>
                  </div>
                ) : (
                  <span className="return-line__done">Already returned</span>
                )}
              </article>
            );
          })}
        </div>

        <label>
          Reason
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is the customer returning this?"
          />
        </label>

        <p className="return-modal__estimate">
          Estimated refund: <strong>{money(refundEstimate)}</strong>
          <small> (the server works out the final amount)</small>
        </p>

        <div className="table-actions">
          <button className="success-button" disabled={!canSubmit}>
            {busy ? "Sending..." : "Request return"}
          </button>
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
