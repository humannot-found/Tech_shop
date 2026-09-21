import { FormEvent, useState } from "react";

import { searchWarranties } from "../../api/client";
import type { StatusTone, WarrantyLookup } from "../../api/types";
import { StatusPill } from "../../components/StatusPill";
import { useAuth } from "../../state/auth";
import { dateLabel } from "../../utils/format";

type WarrantyTabProps = {
  onOpenReceipt: (saleId: string) => Promise<void>;
};

function coverageTone(coverage: string): StatusTone {
  if (coverage === "active") return "success";
  if (coverage === "expired") return "danger";
  return "warning";
}

function coverageLabel(result: WarrantyLookup) {
  if (result.coverage === "active") {
    return result.days_remaining === 1
      ? "Active / 1 day left"
      : `Active / ${result.days_remaining} days left`;
  }
  if (result.coverage === "expired") return "Expired";
  return result.coverage.replace(/_/g, " ");
}

export function WarrantyTab({ onOpenReceipt }: WarrantyTabProps) {
  const { token, isPreview } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<WarrantyLookup[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const needle = identifier.trim();
    if (needle.length < 3) {
      setMessage("Enter at least 3 characters to search.");
      return;
    }
    if (!token || isPreview) {
      setMessage("Sign in with a live cashier account to check warranties.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const found = await searchWarranties(token, needle);
      setResults(found);
      if (!found.length) {
        setMessage(
          "No warranty found. Check the spelling, or the item may not have been sold with warranty at this branch.",
        );
      }
    } catch (error) {
      setResults(null);
      setMessage(
        error instanceof Error ? error.message : "Could not check the warranty.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pos-warranty-workspace">
      <form className="warranty-search" onSubmit={handleSubmit}>
        <label>
          <span>IMEI, serial number, invoice number or customer phone</span>
          <input
            autoFocus
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Scan an IMEI, or type an invoice number or phone"
          />
        </label>
        <button className="primary-button" disabled={busy}>
          {busy ? "Searching..." : "Search"}
        </button>
      </form>

      {message && <div className="warranty-message">{message}</div>}

      {!results && !message && (
        <div className="pos-empty-state">
          <strong>Check a warranty</strong>
          <span>
            Search by IMEI, serial number, invoice number or the customer's
            phone to see what is still covered and which sale it came from.
          </span>
        </div>
      )}

      {results?.map((result) => (
        <article className="warranty-card" key={result.id}>
          <header>
            <div>
              <p className="eyebrow">Warranty</p>
              <h2>{result.description}</h2>
              <span>{result.unit_identifier ?? "No IMEI / serial (bulk item)"}</span>
            </div>
            <StatusPill tone={coverageTone(result.coverage)}>
              {coverageLabel(result)}
            </StatusPill>
          </header>

          <div className="warranty-card__grid">
            <div>
              <span>Covered from</span>
              <strong>{dateLabel(result.start_date)}</strong>
            </div>
            <div>
              <span>Covered until</span>
              <strong>{dateLabel(result.end_date)}</strong>
            </div>
            <div>
              <span>Invoice</span>
              <strong>{result.invoice_number}</strong>
            </div>
            <div>
              <span>Sold on</span>
              <strong>{result.sold_at ? dateLabel(result.sold_at) : "-"}</strong>
            </div>
            <div>
              <span>Customer</span>
              <strong>{result.customer_name ?? "Walk-in customer"}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{result.customer_phone ?? "-"}</strong>
            </div>
          </div>

          <div className="warranty-card__actions">
            <button type="button" onClick={() => void onOpenReceipt(result.sale_id)}>
              Open original receipt
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
