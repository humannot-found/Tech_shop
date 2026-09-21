import type { ShiftReport } from "../../api/types";
import { dateLabel } from "../../utils/format";
import { kindLabel } from "./CashMovementModal";
import { money } from "./utils";

type ShiftReportModalProps = {
  report: ShiftReport;
  onPrint: () => void;
  onClose: () => void;
};

function amount(value: string | null) {
  return value === null ? "-" : money(Number(value));
}

export function ShiftReportModal({
  report,
  onPrint,
  onClose,
}: ShiftReportModalProps) {
  const isClosed = report.status === "closed";
  const variance = report.variance === null ? null : Number(report.variance);

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Shift report"
      >
        <header className="receipt-modal__header">
          <div>
            <p className="eyebrow">{isClosed ? "End-of-shift report" : "Shift so far"}</p>
            <h2>
              {report.till_name} / {report.till_code}
            </h2>
            <span>{report.branch_name}</span>
          </div>
          <div className="table-actions">
            <button onClick={onPrint}>Print</button>
            <button onClick={onClose}>Close</button>
          </div>
        </header>

        <div className="receipt-paper">
          <div className="receipt-paper__meta">
            <div>
              <span>Cashier</span>
              <strong>{report.cashier_name}</strong>
            </div>
            <div>
              <span>Opened</span>
              <strong>{dateLabel(report.opened_at)}</strong>
            </div>
            <div>
              <span>{isClosed ? "Closed" : "Status"}</span>
              <strong>{isClosed ? dateLabel(report.closed_at) : "Still open"}</strong>
            </div>
          </div>

          <h3 className="shift-report__heading">Sales</h3>
          <div className="receipt-totals">
            <div>
              <span>Completed sales</span>
              <strong>{report.sale_count}</strong>
            </div>
            <div>
              <span>Items sold</span>
              <strong>{report.items_sold}</strong>
            </div>
            <div>
              <span>Gross sales</span>
              <strong>{amount(report.gross_sales)}</strong>
            </div>
            <div>
              <span>Discounts</span>
              <strong>{amount(report.discounts)}</strong>
            </div>
            <div className="receipt-totals__grand">
              <span>Net sales</span>
              <strong>{amount(report.net_sales)}</strong>
            </div>
            <div>
              <span>Repair payments taken</span>
              <strong>{amount(report.repair_payments)}</strong>
            </div>
            <div>
              <span>Voided sales</span>
              <strong>{report.voided_count}</strong>
            </div>
            <div>
              <span>Approved returns</span>
              <strong>
                {report.return_count} / {amount(report.refunds_total)} refunded
              </strong>
            </div>
          </div>

          <h3 className="shift-report__heading">Payments by method</h3>
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Method</th>
                <th>Received</th>
                <th>Refunded</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {report.payments.length === 0 && (
                <tr>
                  <td colSpan={4}>No payments yet.</td>
                </tr>
              )}
              {report.payments.map((line) => (
                <tr key={line.method}>
                  <td>{line.method.replace(/_/g, " ").toUpperCase()}</td>
                  <td>{amount(line.received)}</td>
                  <td>{amount(line.refunded)}</td>
                  <td>{amount(line.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="shift-report__heading">Cash drawer</h3>
          <div className="receipt-totals">
            <div>
              <span>Opening float</span>
              <strong>{amount(report.opening_float)}</strong>
            </div>
            <div>
              <span>Cash sales</span>
              <strong>{amount(report.cash_sales)}</strong>
            </div>
            <div>
              <span>Cash refunds</span>
              <strong>-{amount(report.cash_refunds)}</strong>
            </div>
            <div>
              <span>Cash in</span>
              <strong>{amount(report.cash_in)}</strong>
            </div>
            <div>
              <span>Paid out</span>
              <strong>-{amount(report.paid_out)}</strong>
            </div>
            <div>
              <span>Cash drops</span>
              <strong>-{amount(report.cash_drop)}</strong>
            </div>
            {report.expected_cash !== null && (
              <div>
                <span>Expected in drawer</span>
                <strong>{amount(report.expected_cash)}</strong>
              </div>
            )}
            {isClosed && (
              <>
                <div>
                  <span>Counted cash</span>
                  <strong>{amount(report.closing_cash)}</strong>
                </div>
                <div className="receipt-totals__grand">
                  <span>Variance</span>
                  <strong>
                    {variance === null
                      ? "-"
                      : variance === 0
                        ? "Balanced"
                        : `${variance > 0 ? "Over" : "Short"} ${money(Math.abs(variance))}`}
                  </strong>
                </div>
              </>
            )}
          </div>

          {report.movements.length > 0 && (
            <>
              <h3 className="shift-report__heading">Cash movements</h3>
              <div className="receipt-payments">
                {report.movements.map((item) => (
                  <span key={`${item.created_at}-${item.amount}-${item.reason}`}>
                    {kindLabel(item.kind)} / {money(Number(item.amount))} / {item.reason}
                    {` / ${dateLabel(item.created_at)}`}
                  </span>
                ))}
              </div>
            </>
          )}

          {!isClosed && (
            <div className="receipt-footer-note">
              <span>
                Interim figures. The expected cash total is shown only after the
                till is closed, so the drawer is counted without it.
              </span>
            </div>
          )}

          <div className="shift-report__signatures">
            <span>Cashier signature</span>
            <span>Manager signature</span>
          </div>
        </div>
      </section>
    </div>
  );
}
