import type { Dispatch, SetStateAction } from "react";

import type { Payment, PosSale, StatusTone } from "../../api/types";
import { StatusPill } from "../../components/StatusPill";
import type { PaymentMethod, SplitMethod } from "./types";
import {
  money,
  paymentStatusTone,
  quickCashAmounts,
  splitBalanceLabel,
} from "./utils";

type PaymentModalProps = {
  cashierName: string | undefined;
  paymentTotal: number;
  paymentSubtotal: number;
  paymentDiscount: number;
  paymentOutstanding: number;
  onClose: () => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  paymentStatus: string | null;
  pendingSale: PosSale | null;
  attemptsBusy: boolean;
  currentPaymentAttempts: Payment[];
  paymentBusy: boolean;
  refreshPaymentAttempts: (saleId: string) => Promise<void>;
  checkMpesaAttempt: (payment: Payment) => Promise<void>;
  markAttemptOutcome: (payment: Payment, status: "failed" | "cancelled", notes: string) => Promise<void>;
  cancelUnpaidSale: (sale?: PosSale | null) => Promise<void>;
  splitTone: StatusTone;
  splitBalance: number;
  splitTotal: number;
  fillSplitAmount: (method: SplitMethod) => void;
  splitAmounts: Record<SplitMethod, string>;
  setSplitAmounts: Dispatch<SetStateAction<Record<SplitMethod, string>>>;
  splitMpesaAmount: number;
  splitCardAmount: number;
  mpesaPhone: string;
  setMpesaPhone: (value: string) => void;
  splitCardReference: string;
  setSplitCardReference: (value: string) => void;
  paymentReference: string;
  setPaymentReference: (value: string) => void;
  recordCardDecline: () => Promise<void>;
  mpesaReceiptCode: string;
  setMpesaReceiptCode: (value: string) => void;
  manuallyCompleteMpesaPayment: () => Promise<void>;
  isRecoveringPendingSale: boolean;
  completePayment: () => Promise<void>;
  cashTendered: string;
  setCashTendered: (value: string) => void;
};

export function PaymentModal({
  cashierName,
  paymentTotal,
  paymentSubtotal,
  paymentDiscount,
  paymentOutstanding,
  onClose,
  paymentMethod,
  setPaymentMethod,
  paymentStatus,
  pendingSale,
  attemptsBusy,
  currentPaymentAttempts,
  paymentBusy,
  refreshPaymentAttempts,
  checkMpesaAttempt,
  markAttemptOutcome,
  cancelUnpaidSale,
  splitTone,
  splitBalance,
  splitTotal,
  fillSplitAmount,
  splitAmounts,
  setSplitAmounts,
  splitMpesaAmount,
  splitCardAmount,
  mpesaPhone,
  setMpesaPhone,
  splitCardReference,
  setSplitCardReference,
  paymentReference,
  setPaymentReference,
  recordCardDecline,
  mpesaReceiptCode,
  setMpesaReceiptCode,
  manuallyCompleteMpesaPayment,
  isRecoveringPendingSale,
  completePayment,
  cashTendered,
  setCashTendered,
}: PaymentModalProps) {
  const receivedAmount = Number(cashTendered) || 0;
  const changeDue = Math.max(0, receivedAmount - paymentOutstanding);
  const shortBy = Math.max(0, paymentOutstanding - receivedAmount);

  function pressKey(key: string) {
    if (key === "Clear") {
      setCashTendered("");
    } else if (key === ".") {
      if (!cashTendered.includes(".")) setCashTendered((cashTendered || "0") + ".");
    } else if (cashTendered.length < 9) {
      setCashTendered(cashTendered === "0" ? key : cashTendered + key);
    }
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Payment"
      >
        <header className="payment-modal__header">
          <div>
            <p className="eyebrow">Payment</p>
            <h2>{money(paymentTotal)}</h2>
            <span>Cashier: {cashierName}</span>
          </div>
          <button onClick={() => onClose()}>Close</button>
        </header>

        <div className="payment-modal__body">
          <section className="payment-method-panel">
            <h3>Payment Method</h3>
            <div className="payment-methods">
              {(["cash", "mpesa", "card", "split"] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  className={paymentMethod === method ? "is-active" : ""}
                  onClick={() => setPaymentMethod(method)}
                >
                  {method === "mpesa" ? "M-Pesa" : method}
                </button>
              ))}
            </div>
            {paymentStatus && (
              <div className="payment-status-banner">
                <strong>Payment status</strong>
                <span>{paymentStatus}</span>
              </div>
            )}
            {pendingSale && (
              <section className="payment-attempts-panel">
                <header>
                  <div>
                    <strong>Payment attempts</strong>
                    <span>
                      Outstanding {money(paymentOutstanding)} / Paid{" "}
                      {money(Number(pendingSale.paid_amount))}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={attemptsBusy}
                    onClick={() => void refreshPaymentAttempts(pendingSale.id)}
                  >
                    {attemptsBusy ? "Loading..." : "Refresh"}
                  </button>
                </header>

                {currentPaymentAttempts.length === 0 && (
                  <div className="payment-attempts-empty">
                    No payment attempts recorded yet.
                  </div>
                )}

                {currentPaymentAttempts.map((attempt) => (
                  <article className="payment-attempt-row" key={attempt.id}>
                    <div>
                      <strong>
                        {attempt.method.replace(/_/g, " ").toUpperCase()} /{" "}
                        {money(Number(attempt.amount))}
                      </strong>
                      <span>
                        {attempt.provider_reference
                          ? `Ref ${attempt.provider_reference}`
                          : "No provider reference"}
                      </span>
                      {attempt.notes && <span>{attempt.notes}</span>}
                    </div>
                    <StatusPill tone={paymentStatusTone(attempt.status)}>
                      {attempt.status.replace(/_/g, " ")}
                    </StatusPill>
                    {attempt.status === "pending" && (
                      <div className="payment-attempt-actions">
                        {attempt.method === "mpesa" && (
                          <button
                            type="button"
                            disabled={paymentBusy}
                            onClick={() => void checkMpesaAttempt(attempt)}
                          >
                            Check Status
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={paymentBusy}
                          onClick={() =>
                            void markAttemptOutcome(
                              attempt,
                              "cancelled",
                              "Cashier marked this attempt as cancelled by the customer.",
                            )
                          }
                        >
                          Customer Cancelled
                        </button>
                        <button
                          type="button"
                          disabled={paymentBusy}
                          onClick={() =>
                            void markAttemptOutcome(
                              attempt,
                              "failed",
                              "Cashier marked this attempt as timed out or declined.",
                            )
                          }
                        >
                          Mark Failed
                        </button>
                      </div>
                    )}
                  </article>
                ))}
                {Number(pendingSale.paid_amount) === 0 && (
                  <button
                    type="button"
                    className="danger-button cancel-sale-button"
                    disabled={paymentBusy}
                    onClick={() => void cancelUnpaidSale()}
                  >
                    Cancel Unpaid Sale
                  </button>
                )}
              </section>
            )}
            {paymentMethod === "split" && (
              <section className="split-payment-panel">
                <div className="split-payment-summary">
                  <strong>Split this payment</strong>
                  <StatusPill tone={splitTone}>
                    {splitBalanceLabel(splitBalance)}
                  </StatusPill>
                  <span>Total selected: {money(splitTotal)}</span>
                </div>
                <div className="split-payment-tools">
                  <button type="button" onClick={() => fillSplitAmount("cash")}>
                    Fill cash balance
                  </button>
                  <button type="button" onClick={() => fillSplitAmount("mpesa")}>
                    Fill M-Pesa balance
                  </button>
                  <button type="button" onClick={() => fillSplitAmount("card")}>
                    Fill card balance
                  </button>
                </div>
                <label>
                  Cash amount
                  <input
                    type="number"
                    min="0"
                    value={splitAmounts.cash}
                    onChange={(event) =>
                      setSplitAmounts((current) => ({
                        ...current,
                        cash: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </label>
                <label>
                  M-Pesa amount
                  <input
                    type="number"
                    min="0"
                    value={splitAmounts.mpesa}
                    onChange={(event) =>
                      setSplitAmounts((current) => ({
                        ...current,
                        mpesa: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </label>
                {splitMpesaAmount > 0 && (
                  <label>
                    M-Pesa phone
                    <input
                      value={mpesaPhone}
                      onChange={(event) => setMpesaPhone(event.target.value)}
                      placeholder="0712 345 678"
                    />
                  </label>
                )}
                <label>
                  Card amount
                  <input
                    type="number"
                    min="0"
                    value={splitAmounts.card}
                    onChange={(event) =>
                      setSplitAmounts((current) => ({
                        ...current,
                        card: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </label>
                {splitCardAmount > 0 && (
                  <label>
                    Card reference
                    <input
                      value={splitCardReference}
                      onChange={(event) => setSplitCardReference(event.target.value)}
                      placeholder="Card approval/reference number"
                    />
                  </label>
                )}
              </section>
            )}
            {paymentMethod === "mpesa" && (
              <label className="payment-reference">
                Customer M-Pesa phone
                <input
                  value={mpesaPhone}
                  onChange={(event) => setMpesaPhone(event.target.value)}
                  placeholder="0712 345 678 or 254712345678"
                />
              </label>
            )}
            {paymentMethod === "card" && (
              <section className="card-payment-panel">
                <label className="payment-reference">
                  Card reference
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="Card approval/reference number"
                  />
                </label>
                <button
                  type="button"
                  className="danger-button"
                  disabled={paymentBusy}
                  onClick={() => void recordCardDecline()}
                >
                  Card Declined
                </button>
              </section>
            )}
            {pendingSale &&
              (paymentMethod === "mpesa" ||
                (paymentMethod === "split" && splitMpesaAmount > 0)) && (
                <section className="manual-mpesa-panel">
                  <div>
                    <strong>Paid but callback is slow?</strong>
                    <span>
                      Enter the M-Pesa receipt code from the customer's SMS to
                      generate the receipt immediately.
                    </span>
                  </div>
                  <label>
                    M-Pesa receipt code
                    <input
                      value={mpesaReceiptCode}
                      onChange={(event) => setMpesaReceiptCode(event.target.value)}
                      placeholder="e.g. QG12ABCDEF"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={paymentBusy}
                    onClick={() => void manuallyCompleteMpesaPayment()}
                  >
                    Confirm M-Pesa Payment
                  </button>
                </section>
              )}
            <table className="payment-table">
              <tbody>
                <tr>
                  <th>Subtotal</th>
                  <td>{money(paymentSubtotal)}</td>
                </tr>
                <tr>
                  <th>Discount</th>
                  <td>{money(paymentDiscount)}</td>
                </tr>
                <tr>
                  <th>Net Payable</th>
                  <td>{money(paymentTotal)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="numpad-panel">
            <div className="numpad-display">
              {paymentMethod === "cash" && cashTendered !== ""
                ? money(receivedAmount)
                : money(paymentTotal)}
            </div>
            {paymentMethod === "cash" && (
              <>
                <div className="cash-tender-summary">
                  <span>
                    {cashTendered === "" ? "Amount received (optional)" : "Amount received"}
                  </span>
                  {cashTendered !== "" && shortBy > 0 ? (
                    <strong className="is-short">Short by {money(shortBy)}</strong>
                  ) : (
                    <strong className={changeDue > 0 ? "is-change" : ""}>
                      Change due {money(changeDue)}
                    </strong>
                  )}
                </div>
                <div className="quick-cash">
                  <button type="button" onClick={() => setCashTendered(String(Math.ceil(paymentOutstanding)))}>
                    Exact
                  </button>
                  {quickCashAmounts(paymentOutstanding)
                    .filter((amount) => amount !== Math.ceil(paymentOutstanding))
                    .map((amount) => (
                      <button
                        type="button"
                        key={amount}
                        onClick={() => setCashTendered(String(amount))}
                      >
                        {money(amount)}
                      </button>
                    ))}
                </div>
                <div className="numpad">
                  {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "Clear"].map(
                    (key) => (
                      <button type="button" key={key} onClick={() => pressKey(key)}>
                        {key}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
            <button
              className="success-button confirm-payment"
              disabled={paymentBusy || isRecoveringPendingSale}
              onClick={completePayment}
            >
              {isRecoveringPendingSale
                ? "Use Receipt Code Above"
                : paymentBusy
                ? paymentMethod === "mpesa"
                  ? "Waiting for M-Pesa..."
                  : paymentMethod === "split"
                    ? "Processing Split..."
                  : "Completing..."
                : paymentMethod === "mpesa"
                  ? "Send M-Pesa Prompt"
                  : paymentMethod === "split"
                    ? "Complete Split Payment"
                  : "Confirm Payment"}
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}
