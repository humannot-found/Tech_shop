import { useEffect, useMemo, useState } from "react";

import { listReorderRows, saveReorderLevels } from "../../api/client";
import type { ReorderRow } from "../../api/types";
import { StatusPill } from "../../components/StatusPill";
import { integer } from "../../utils/format";

type ReorderLevelsModalProps = {
  token: string;
  branchId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
};

type Filter = "all" | "unset";

export function ReorderLevelsModal({
  token,
  branchId,
  onClose,
  onSaved,
}: ReorderLevelsModalProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("unset");
  const [rows, setRows] = useState<ReorderRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [bulkValue, setBulkValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(null);
    const timer = window.setTimeout(() => {
      listReorderRows(token, branchId, query)
        .then((page) => {
          if (active) setRows(page.items);
        })
        .catch((failure) => {
          if (active) {
            setError(
              failure instanceof Error ? failure.message : "Could not load stock items.",
            );
          }
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [token, branchId, query]);

  const shown = useMemo(
    () =>
      rows.filter((row) => filter === "all" || row.reorder_level === 0),
    [rows, filter],
  );

  function valueFor(row: ReorderRow) {
    return edits[row.variant_id] ?? String(row.reorder_level);
  }

  function isValid(value: string) {
    return /^\d{1,7}$/.test(value.trim());
  }

  const changes = rows.flatMap((row) => {
    const edited = edits[row.variant_id];
    if (edited === undefined || !isValid(edited)) return [];
    const level = Number(edited);
    return level === row.reorder_level ? [] : [{ row, level }];
  });
  const invalidCount = Object.entries(edits).filter(
    ([, value]) => !isValid(value),
  ).length;

  function applyToShown() {
    if (!isValid(bulkValue)) return;
    setEdits((current) => {
      const next = { ...current };
      for (const row of shown) next[row.variant_id] = bulkValue.trim();
      return next;
    });
  }

  async function handleSave() {
    if (!changes.length || invalidCount) return;
    setSaving(true);
    setError(null);
    try {
      await saveReorderLevels(token, {
        branch_id: branchId,
        items: changes.map(({ row, level }) => ({
          variant_id: row.variant_id,
          reorder_level: level,
        })),
      });
      onSaved(`Reorder level saved for ${changes.length} item(s).`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="supervisor-modal reorder-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Reorder levels"
      >
        <header>
          <p className="eyebrow">Low-stock alerts</p>
          <h2>Reorder levels</h2>
          <span>
            An item is flagged as low when the stock you can sell falls to its
            reorder level or below. Leave 0 to only be alerted when it runs out.
            Items you have never received show up here too, so you can set the
            level before the first delivery.
          </span>
        </header>

        <div className="reorder-toolbar">
          <input
            aria-label="Search items"
            placeholder="Search SKU or product"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="reorder-toolbar__filters" role="group" aria-label="Show">
            <button
              type="button"
              className={filter === "unset" ? "is-active" : ""}
              onClick={() => setFilter("unset")}
            >
              Not set
            </button>
            <button
              type="button"
              className={filter === "all" ? "is-active" : ""}
              onClick={() => setFilter("all")}
            >
              All
            </button>
          </div>
          <div className="reorder-toolbar__bulk">
            <input
              aria-label="Level for all shown"
              type="number"
              min="0"
              placeholder="Level"
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
            />
            <button type="button" onClick={applyToShown} disabled={!isValid(bulkValue)}>
              Set all shown
            </button>
          </div>
        </div>

        <div className="reorder-table-wrap">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th>Available</th>
                <th>Reorder at</th>
              </tr>
            </thead>
            <tbody>
              {busy && (
                <tr>
                  <td colSpan={4}>Loading...</td>
                </tr>
              )}
              {!busy && shown.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    {filter === "unset"
                      ? "Every item shown already has a reorder level."
                      : "No items match."}
                  </td>
                </tr>
              )}
              {shown.map((row) => {
                const value = valueFor(row);
                return (
                  <tr key={row.variant_id}>
                    <td>{row.sku}</td>
                    <td>
                      {row.product_name} / {row.variant_name}
                      {row.stock_balance_id === null && (
                        <StatusPill tone="neutral">Never received</StatusPill>
                      )}
                    </td>
                    <td>{integer(row.available_quantity)}</td>
                    <td>
                      <input
                        className={isValid(value) ? "" : "is-invalid"}
                        aria-label={`Reorder level for ${row.sku}`}
                        type="number"
                        min="0"
                        value={value}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [row.variant_id]: event.target.value,
                          }))
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length >= 200 && (
          <small className="reorder-note">
            Showing the first 200 items. Search to narrow the list.
          </small>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="table-actions">
          <button
            className="success-button"
            disabled={saving || !changes.length || invalidCount > 0}
            onClick={() => void handleSave()}
          >
            {saving
              ? "Saving..."
              : changes.length
                ? `Save ${changes.length} change${changes.length === 1 ? "" : "s"}`
                : "No changes"}
          </button>
          <button type="button" onClick={onClose} disabled={saving}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
