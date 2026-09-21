import type { Receipt } from "../../api/types";
import { dateLabel } from "../../utils/format";
import { money } from "./utils";

type ReceiptModalProps = {
  receipt: Receipt;
  onPrint: () => void;
  onClose: () => void;
};

export function ReceiptModal({
  receipt,
  onPrint,
  onClose,
}: ReceiptModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Receipt"
      >
        <header className="receipt-modal__header">
          <div>
            <p className="eyebrow">Receipt</p>
            <h2>{receipt.invoice_number}</h2>
            <span>
              {receipt.branch_name} / {receipt.branch_code}
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
              <p className="eyebrow">Crystal-shop POS</p>
              <h3>{receipt.branch_name}</h3>
              <span>
                {receipt.branch_address ??
                  `${receipt.branch_code} branch`}
              </span>
            </div>
            <div>
              <span>Invoice number</span>
              <strong>{receipt.invoice_number}</strong>
              <span>{dateLabel(receipt.completed_at)}</span>
            </div>
          </div>

          <div className="receipt-paper__meta">
            <div>
              <span>Cashier</span>
              <strong>{receipt.cashier_name ?? "Cashier"}</strong>
            </div>
            <div>
              <span>Customer</span>
              <strong>{receipt.customer_name ?? "Walk-in customer"}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{receipt.sale_status.replace(/_/g, " ")}</strong>
            </div>
            <div>
              <span>Sale date</span>
              <strong>{dateLabel(receipt.completed_at)}</strong>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{money(Number(item.unit_price))}</td>
                  <td>{money(Number(item.line_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-totals">
            <div>
              <span>Subtotal</span>
              <strong>{money(Number(receipt.subtotal))}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>{money(Number(receipt.discount_amount))}</strong>
            </div>
            <div>
              <span>Paid</span>
              <strong>{money(Number(receipt.paid_amount))}</strong>
            </div>
            <div className="receipt-totals__grand">
              <span>Total</span>
              <strong>{money(Number(receipt.total_amount))}</strong>
            </div>
          </div>

          <div className="receipt-payments">
            <strong>Payments</strong>
            {receipt.payments.map((payment) => (
              <span key={`${payment.method}-${payment.paid_at ?? payment.amount}`}>
                {payment.method.toUpperCase()} / {money(Number(payment.amount))}
                {payment.provider_reference ? ` / Ref ${payment.provider_reference}` : ""}
                {payment.payer_phone ? ` / Payer ${payment.payer_phone}` : ""}
                {` / ${dateLabel(payment.paid_at)}`}
              </span>
            ))}
          </div>

          <div className="receipt-footer-note">
            <strong>Thank you for shopping with us.</strong>
            <span>
              Keep this receipt for warranty, returns, and service tracking.
              Returns, voids, and refunds are subject to manager approval.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
