import type { TillSession } from "../../api/types";
import { StatusPill } from "../../components/StatusPill";
import { useAuth } from "../../state/auth";
import { dateLabel } from "../../utils/format";
import type { RepairPaymentMethod } from "./types";
import type { RepairDeskController } from "./useRepairDesk";
import { money } from "./utils";

type RepairPickupsTabProps = {
  desk: RepairDeskController;
  tillSession: TillSession | null;
};

export function RepairPickupsTab({
  desk,
  tillSession,
}: RepairPickupsTabProps) {
  const { token, isPreview } = useAuth();
  const {
    repairPickups,
    selectedRepairInvoice,
    lastCollectedRepair,
    setLastCollectedRepair,
    setRepairReceiptViewer,
    repairPickupBusy,
    repairPaymentMethod,
    setRepairPaymentMethod,
    repairPaymentAmount,
    setRepairPaymentAmount,
    repairPaymentReference,
    setRepairPaymentReference,
    repairPaymentNotes,
    setRepairPaymentNotes,
    repairMpesaPhone,
    setRepairMpesaPhone,
    repairMpesaReceiptCode,
    setRepairMpesaReceiptCode,
    repairPaymentStatus,
    repairPendingPayment,
    selectedRepairBalance,
    selectedRepairPaid,
    collectRepairIssue,
    canCollectSelectedRepair,
    selectRepairPickup,
    refreshRepairPickups,
    manuallyCompleteRepairMpesaPayment,
    recordRepairPickupPayment,
    completeRepairPickup,
  } = desk;

  return (
    <section className="pos-repair-pickups-workspace">
      <section className="repair-pickup-queue">
        <header>
          <div>
            <p className="eyebrow">Repair payment desk</p>
            <strong>Payments & pickups</strong>
            <span>
              Ready repairs appear here automatically. Repairs opened from
              the repair desk can also be paid from this POS workspace.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void refreshRepairPickups()}
            disabled={repairPickupBusy}
          >
            {repairPickupBusy ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {!tillSession && token && !isPreview && (
          <div className="repair-pickup-warning">
            Open your till before recording repair payments or handing over
            repaired devices.
          </div>
        )}

        <div className="repair-pickup-list">
          {repairPickups.length === 0 && (
            <div className="pos-empty-state">
              <strong>No repair pickups yet</strong>
              <span>
                Once a technician marks a repair ready, its invoice appears here
                for the cashier.
              </span>
            </div>
          )}

          {repairPickups.map((invoice) => {
            const balance = Number(invoice.balance_due);
            const paid = Number(invoice.paid_amount);
            return (
              <button
                type="button"
                className={
                  selectedRepairInvoice?.ticket_id === invoice.ticket_id
                    ? "repair-pickup-row is-selected"
                    : "repair-pickup-row"
                }
                key={invoice.ticket_id}
                onClick={() => selectRepairPickup(invoice)}
              >
                <div>
                  <strong>{invoice.ticket_number}</strong>
                  <span>{invoice.customer_name}</span>
                  <small>{invoice.device_description}</small>
                </div>
                <div>
                  <strong>{money(Number(invoice.total_amount))}</strong>
                  <span>
                    {balance === 0
                      ? "Fully paid"
                      : paid > 0
                        ? `${money(balance)} balance`
                        : "Unpaid"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="repair-pickup-detail">
        {!selectedRepairInvoice && !lastCollectedRepair && (
          <div className="pos-empty-state">
            <strong>Select a repair invoice</strong>
            <span>
              The cashier will see the invoice details, record payment, print,
              then complete collection from here.
            </span>
          </div>
        )}

        {!selectedRepairInvoice && lastCollectedRepair && (
          <article className="repair-collected-card">
            <header>
              <div>
                <p className="eyebrow">Collection complete</p>
                <h2>{lastCollectedRepair.ticket_number}</h2>
                <span>
                  {lastCollectedRepair.invoice.customer_name} /{" "}
                  {lastCollectedRepair.invoice.customer_phone}
                </span>
              </div>
              <StatusPill tone="success">Collected</StatusPill>
            </header>

            <div className="repair-pickup-device">
              <span>Device handed over</span>
              <strong>{lastCollectedRepair.invoice.device_description}</strong>
            </div>

            <div className="repair-pickup-totals">
              <div>
                <span>Total paid</span>
                <strong>
                  {money(Number(lastCollectedRepair.invoice.total_amount))}
                </strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{lastCollectedRepair.status.replace(/_/g, " ")}</strong>
              </div>
              <div className="repair-pickup-totals__balance">
                <span>Collected at</span>
                <strong>{dateLabel(lastCollectedRepair.collected_at)}</strong>
              </div>
            </div>

            <div className="repair-pickup-actions">
              <button
                type="button"
                onClick={() =>
                  setRepairReceiptViewer(lastCollectedRepair.invoice)
                }
              >
                Print / view invoice
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setLastCollectedRepair(null)}
              >
                Clear confirmation
              </button>
            </div>
          </article>
        )}

        {selectedRepairInvoice && (
          <>
            <header>
              <div>
                <p className="eyebrow">Selected repair invoice</p>
                <h2>{selectedRepairInvoice.ticket_number}</h2>
                <span>
                  {selectedRepairInvoice.customer_name} /{" "}
                  {selectedRepairInvoice.customer_phone}
                </span>
              </div>
              <StatusPill
                tone={
                  selectedRepairBalance === 0
                    ? "success"
                    : selectedRepairPaid > 0
                      ? "warning"
                      : "neutral"
                }
              >
                {selectedRepairInvoice.payment_status.replace(/_/g, " ")}
              </StatusPill>
            </header>

            <div className="repair-pickup-device">
              <span>Device</span>
              <strong>{selectedRepairInvoice.device_description}</strong>
            </div>

            <div className="repair-pickup-totals">
              <div>
                <span>Labor</span>
                <strong>{money(Number(selectedRepairInvoice.labor_amount))}</strong>
              </div>
              <div>
                <span>Parts</span>
                <strong>{money(Number(selectedRepairInvoice.parts_amount))}</strong>
              </div>
              <div>
                <span>Paid</span>
                <strong>{money(selectedRepairPaid)}</strong>
              </div>
              <div className="repair-pickup-totals__balance">
                <span>Balance</span>
                <strong>{money(selectedRepairBalance)}</strong>
              </div>
            </div>

            <form
              className="repair-pickup-payment"
              onSubmit={recordRepairPickupPayment}
            >
              <label>
                Payment method
                <select
                  name="repair_payment_method"
                  value={repairPaymentMethod}
                  onChange={(event) =>
                    setRepairPaymentMethod(
                      event.target.value as RepairPaymentMethod,
                    )
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label>
                Amount
                <input
                  name="repair_payment_amount"
                  type="number"
                  min="0"
                  max={selectedRepairBalance || undefined}
                  value={repairPaymentAmount}
                  onChange={(event) => setRepairPaymentAmount(event.target.value)}
                  placeholder="0"
                />
              </label>
              {repairPaymentMethod !== "cash" && (
                <label>
                  {repairPaymentMethod === "mpesa"
                    ? "M-Pesa receipt code"
                    : "Card reference"}
                  <input
                    name="repair_payment_reference"
                    value={repairPaymentReference}
                    onChange={(event) =>
                      setRepairPaymentReference(event.target.value)
                    }
                    placeholder={
                      repairPaymentMethod === "mpesa"
                        ? "Optional: enter code if customer already paid"
                        : "Card terminal approval/reference"
                    }
                  />
                </label>
              )}
              {repairPaymentMethod === "mpesa" && (
                <label>
                  M-Pesa phone
                  <input
                    name="repair_mpesa_phone"
                    value={repairMpesaPhone}
                    onChange={(event) => setRepairMpesaPhone(event.target.value)}
                    placeholder="07XXXXXXXX"
                  />
                  <small>
                    Leave receipt code empty to send a customer STK prompt.
                  </small>
                </label>
              )}
              <label>
                Notes
                <input
                  name="repair_payment_notes"
                  value={repairPaymentNotes}
                  onChange={(event) => setRepairPaymentNotes(event.target.value)}
                  placeholder="Optional cashier note"
                />
              </label>
              <button
                className="success-button"
                disabled={
                  repairPickupBusy ||
                  selectedRepairBalance <= 0 ||
                  Boolean(token && !isPreview && !tillSession)
                }
              >
                {repairPickupBusy
                  ? "Processing..."
                  : repairPaymentMethod === "mpesa" &&
                      !repairPaymentReference.trim()
                    ? "Send M-Pesa prompt"
                    : "Record payment"}
              </button>
            </form>

            {repairPaymentStatus && (
              <div className="repair-pickup-warning">
                {repairPaymentStatus}
              </div>
            )}

            {repairPendingPayment && repairPendingPayment.status === "pending" && (
              <section className="manual-mpesa-panel repair-mpesa-confirm">
                <div>
                  <strong>Waiting for M-Pesa callback</strong>
                  <span>
                    If the customer has paid but the receipt has not appeared,
                    enter the receipt code from their SMS.
                  </span>
                </div>
                <label>
                  M-Pesa receipt code
                  <input
                    name="repair_mpesa_receipt_code"
                    value={repairMpesaReceiptCode}
                    onChange={(event) =>
                      setRepairMpesaReceiptCode(event.target.value)
                    }
                    placeholder="e.g. QH123ABC45"
                  />
                </label>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={repairPickupBusy || !repairMpesaReceiptCode.trim()}
                  onClick={() => void manuallyCompleteRepairMpesaPayment()}
                >
                  Confirm repair M-Pesa
                </button>
              </section>
            )}

            <section className="repair-pickup-payments">
              <header>
                <strong>Payment history</strong>
                <button
                  type="button"
                  onClick={() => setRepairReceiptViewer(selectedRepairInvoice)}
                >
                  Open invoice
                </button>
              </header>
              {selectedRepairInvoice.payments.length === 0 && (
                <span>No repair payments recorded yet.</span>
              )}
              {selectedRepairInvoice.payments.length > 0 && (
                <table className="data-table data-table--compact">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Reference</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRepairInvoice.payments.map((payment) => (
                      <tr
                        key={`${payment.method}-${payment.provider_reference ?? payment.paid_at}-${payment.amount}`}
                      >
                        <td>{payment.method.toUpperCase()}</td>
                        <td>{money(Number(payment.amount))}</td>
                        <td>{payment.provider_reference ?? "—"}</td>
                        <td>{dateLabel(payment.paid_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <div className="repair-pickup-actions">
              {canCollectSelectedRepair ? (
                <button
                  type="button"
                  className="success-button"
                  disabled={repairPickupBusy}
                  onClick={() => void completeRepairPickup()}
                >
                  {repairPickupBusy
                    ? "Completing collection..."
                    : "Hand over device"}
                </button>
              ) : (
                <div className="repair-action-hint">
                  {collectRepairIssue}
                </div>
              )}
              <button
                type="button"
                onClick={() => setRepairReceiptViewer(selectedRepairInvoice)}
              >
                Print / view invoice
              </button>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
