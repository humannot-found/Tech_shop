import type { PosSale, Receipt } from "../../api/types";
import { StatusPill } from "../../components/StatusPill";
import { useAuth } from "../../state/auth";
import { dateLabel } from "../../utils/format";
import type { SalesHistoryStatus } from "./types";
import { money, saleStatusTone } from "./utils";

type ReceiptsTabProps = {
  receipt: Receipt | null;
  onOpenReceipt: (receipt: Receipt) => void;
  filteredRecentSales: PosSale[];
  historyBusy: boolean;
  historyStatus: SalesHistoryStatus;
  setHistoryStatus: (status: SalesHistoryStatus) => void;
  historySearch: string;
  setHistorySearch: (value: string) => void;
  paymentBusy: boolean;
  refreshRecentSales: () => Promise<void>;
  openManualMpesaRecovery: (sale: PosSale) => void;
  cancelUnpaidSale: (sale?: PosSale | null) => Promise<void>;
  openReceiptViewer: (saleId: string) => Promise<void>;
  onRequestReturn: (sale: PosSale) => void;
  onRequestVoid: (sale: PosSale) => void;
};

export function ReceiptsTab({
  receipt,
  onOpenReceipt,
  filteredRecentSales,
  historyBusy,
  historyStatus,
  setHistoryStatus,
  historySearch,
  setHistorySearch,
  paymentBusy,
  refreshRecentSales,
  openManualMpesaRecovery,
  cancelUnpaidSale,
  openReceiptViewer,
  onRequestReturn,
  onRequestVoid,
}: ReceiptsTabProps) {
  const { user } = useAuth();

  return (
    <section className="pos-receipts-workspace">
      {receipt && (
        <section className="receipt-strip">
          <div>
            <p className="eyebrow">Last receipt</p>
            <strong>{receipt.invoice_number}</strong>
            <span>
              {receipt.branch_name} / {receipt.cashier_name ?? user?.full_name} /{" "}
              {receipt.items.length} item(s)
            </span>
            <span>{dateLabel(receipt.completed_at)}</span>
          </div>
          <div className="receipt-strip__actions">
            <strong>{money(Number(receipt.total_amount))}</strong>
            <button onClick={() => onOpenReceipt(receipt)}>Open</button>
          </div>
        </section>
      )}

      <section className="sales-history-panel">
        <header>
          <div>
            <p className="eyebrow">Recent sales</p>
            <strong>Receipts / invoices</strong>
          </div>
          <button onClick={() => void refreshRecentSales()} disabled={historyBusy}>
            {historyBusy ? "Loading..." : "Refresh"}
          </button>
        </header>

        <div className="sales-history-filters">
          <label>
            Status
            <select
              value={historyStatus}
              onChange={(event) =>
                setHistoryStatus(event.target.value as SalesHistoryStatus)
              }
            >
              <option value="all">All recent</option>
              <option value="completed">Completed</option>
              <option value="pending_payment">Pending payment</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label>
            Search
            <input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Invoice, status, item, amount"
            />
          </label>
        </div>

        <div className="sales-history-list">
          {filteredRecentSales.length === 0 && (
            <div className="sales-history-empty">
              No sales match the current filters.
            </div>
          )}

          {filteredRecentSales.map((sale) => (
            <article className="sales-history-row" key={sale.id}>
              <div>
                <strong>{sale.invoice_number}</strong>
                <span>
                  {sale.items.length} item(s) / Paid{" "}
                  {money(Number(sale.paid_amount))}
                </span>
                <span>{dateLabel(sale.completed_at ?? sale.created_at)}</span>
              </div>
              <StatusPill tone={saleStatusTone(sale.status)}>
                {sale.status.replace(/_/g, " ")}
              </StatusPill>
              <strong>{money(Number(sale.total_amount))}</strong>
              <div className="sales-history-actions">
                {sale.status === "pending_payment" && (
                  <button
                    type="button"
                    disabled={historyBusy}
                    onClick={() => openManualMpesaRecovery(sale)}
                  >
                    Confirm M-Pesa
                  </button>
                )}
                {sale.status === "pending_payment" &&
                  Number(sale.paid_amount) === 0 && (
                    <button
                      type="button"
                      disabled={historyBusy || paymentBusy}
                      onClick={() => void cancelUnpaidSale(sale)}
                    >
                      Cancel Sale
                    </button>
                  )}
                <button
                  disabled={sale.status !== "completed" || historyBusy}
                  onClick={() => void openReceiptViewer(sale.id)}
                >
                  Receipt
                </button>
                {sale.status === "completed" && (
                  <button
                    type="button"
                    disabled={historyBusy}
                    onClick={() => onRequestReturn(sale)}
                  >
                    Return
                  </button>
                )}
                {(sale.status === "completed" ||
                  (sale.status === "pending_payment" &&
                    Number(sale.paid_amount) > 0)) && (
                  <button
                    type="button"
                    disabled={historyBusy}
                    onClick={() => onRequestVoid(sale)}
                  >
                    Void
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
