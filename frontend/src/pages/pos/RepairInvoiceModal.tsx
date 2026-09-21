import type { RepairInvoice } from "../../api/types";
import { dateLabel } from "../../utils/format";
import { money } from "./utils";

type RepairInvoiceModalProps = {
  invoice: RepairInvoice;
  cashierName: string | undefined;
  onPrint: () => void;
  onClose: () => void;
};

export function RepairInvoiceModal({
  invoice,
  cashierName,
  onPrint,
  onClose,
}: RepairInvoiceModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Repair invoice"
      >
        <header className="receipt-modal__header">
          <div>
            <p className="eyebrow">Repair invoice</p>
            <h2>{invoice.ticket_number}</h2>
            <span>
              {invoice.customer_name} /{" "}
              {invoice.customer_phone}
            </span>
          </div>
          <div className="table-actions">
            <button onClick={onPrint}>Print</button>
            <button onClick={() => onClose()}>Close</button>
          </div>
        </header>

        <div className="receipt-paper">
          <div className="receipt-brand">
            <div>
              <p className="eyebrow">Crystal-shop Repairs</p>
              <h3>{invoice.ticket_number}</h3>
              <span>{invoice.device_description}</span>
            </div>
            <div>
              <span>Receipt date</span>
              <strong>{invoice.payment_status.replace(/_/g, " ")}</strong>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>

          <div className="receipt-paper__meta">
            <div>
              <span>Cashier</span>
              <strong>{cashierName ?? "Cashier"}</strong>
            </div>
            <div>
              <span>Customer</span>
              <strong>{invoice.customer_name}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{invoice.customer_phone}</strong>
            </div>
            <div>
              <span>Branch</span>
              <strong>Current branch</strong>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Service offered</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{invoice.service_description}</strong>
                  <span>{invoice.device_description}</span>
                </td>
                <td>{money(Number(invoice.labor_amount))}</td>
              </tr>
              <tr>
                <td>Parts used during repair</td>
                <td>{money(Number(invoice.parts_amount))}</td>
              </tr>
            </tbody>
          </table>

          <div className="receipt-totals">
            <div>
              <span>Total</span>
              <strong>{money(Number(invoice.total_amount))}</strong>
            </div>
            <div>
              <span>Paid</span>
              <strong>{money(Number(invoice.paid_amount))}</strong>
            </div>
            <div className="receipt-totals__grand">
              <span>Balance</span>
              <strong>{money(Number(invoice.balance_due))}</strong>
            </div>
          </div>

          <div className="receipt-payments">
            <strong>Payments</strong>
            {invoice.payments.length === 0 && (
              <span>No payments recorded yet.</span>
            )}
            {invoice.payments.map((payment) => (
              <span key={`${payment.method}-${payment.paid_at ?? payment.amount}`}>
                {payment.method.toUpperCase()} / {money(Number(payment.amount))}
                {payment.provider_reference ? ` / Ref ${payment.provider_reference}` : ""}
                {payment.payer_phone ? ` / Payer ${payment.payer_phone}` : ""}
                {` / ${dateLabel(payment.paid_at)}`}
              </span>
            ))}
          </div>

          <div className="receipt-footer-note">
            <strong>Thank you for trusting us with your device.</strong>
            <span>
              Keep this repair receipt for warranty follow-up and future service
              tracking.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
