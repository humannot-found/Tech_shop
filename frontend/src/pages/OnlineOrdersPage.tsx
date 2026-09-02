import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  allocateOnlineOrder,
  cancelOnlineOrder,
  currentTillSession,
  fulfillOnlineOrder,
  listBranches,
  listOnlineOrders,
  markOnlineOrderReady,
  recordOnlineOrderPayment,
} from "../api/client";
import type {
  Branch,
  OnlineOrder,
  OnlineOrderPaymentPayload,
  TillSession,
} from "../api/types";
import { StatusPill } from "../components/StatusPill";
import { ToastNotice } from "../components/ToastNotice";
import { useAuth } from "../state/auth";
import { dateLabel, integer, money, titleize, toneForStatus } from "../utils/format";

type OrderStatusFilter = "all" | "pending_payment" | "paid" | "completed" | "cancelled";
type FulfillmentFilter = "all" | "unfulfilled" | "allocated" | "ready" | "fulfilled" | "cancelled";
type OnlinePaymentMethod = OnlineOrderPaymentPayload["method"];

const statusOptions: Array<{ value: OrderStatusFilter; label: string }> = [
  { value: "all", label: "All payment states" },
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const fulfillmentOptions: Array<{ value: FulfillmentFilter; label: string }> = [
  { value: "all", label: "All fulfillment states" },
  { value: "unfulfilled", label: "Needs allocation" },
  { value: "allocated", label: "Allocated" },
  { value: "ready", label: "Ready for pickup/delivery" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

const paymentMethods: Array<{ value: OnlinePaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
];

const emptyPaymentForm = {
  method: "cash" as OnlinePaymentMethod,
  amount: "",
  provider_reference: "",
  payer_phone: "",
  payer_name: "",
  payer_account_reference: "",
  notes: "",
};

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasGlobalAccess(roleCode: string | undefined, permissions: string[] = []) {
  const normalized = String(roleCode ?? "").toLowerCase();
  return ["admin", "owner"].includes(normalized) || permissions.includes("*");
}

function hasReference(method: OnlinePaymentMethod) {
  return method !== "cash";
}

function referenceLabel(method: OnlinePaymentMethod) {
  if (method === "mpesa") return "M-Pesa transaction code";
  if (method === "card") return "Card authorization/reference";
  if (method === "bank_transfer") return "Bank transfer reference";
  return "Reference";
}

function orderSearchText(order: OnlineOrder) {
  return [
    order.order_number,
    order.branch_name,
    order.status,
    order.fulfillment_status,
    order.customer.full_name,
    order.customer.phone,
    order.customer.email,
    order.delivery_method,
    order.delivery_address,
    order.items.map((item) => `${item.description} ${item.sku}`).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function orderItemCount(order: OnlineOrder) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function isFullyPaid(order: OnlineOrder | undefined) {
  return Boolean(order && numberValue(order.balance_due) <= 0 && order.status !== "pending_payment");
}

function canCancelOrder(order: OnlineOrder | undefined) {
  if (!order) return false;
  if (numberValue(order.paid_amount) > 0) return false;
  return !["completed", "cancelled"].includes(order.status) && order.fulfillment_status !== "fulfilled";
}

function paymentFormIssue(
  order: OnlineOrder | undefined,
  form: typeof emptyPaymentForm,
  tillSession: TillSession | null,
) {
  if (!order) return "Select an online order first.";
  const outstanding = numberValue(order.balance_due);
  const amount = numberValue(form.amount);
  if (outstanding <= 0) return "This order is already fully paid.";
  if (amount <= 0) return "Payment amount must be greater than zero.";
  if (amount > outstanding) return "Payment cannot exceed the outstanding order balance.";
  if (form.method === "cash" && !tillSession) {
    return "Cash payments need an open till session for the signed-in cashier.";
  }
  if (hasReference(form.method) && !form.provider_reference.trim()) {
    return `${referenceLabel(form.method)} is required.`;
  }
  return null;
}

function orderProgressHint(order: OnlineOrder | undefined) {
  if (!order) return "Select an order to see its next step.";
  if (order.fulfillment_status === "cancelled") return "This order was cancelled.";
  if (order.fulfillment_status === "fulfilled") return "This order has been fulfilled.";
  if (!isFullyPaid(order)) return "Collect or confirm payment before allocating stock.";
  if (order.fulfillment_status === "unfulfilled") return "Allocate stock so the item cannot be sold elsewhere.";
  if (order.fulfillment_status === "allocated") return "Mark ready once the order is packed.";
  if (order.fulfillment_status === "ready") return "Fulfill when the customer collects or delivery leaves.";
  return "Review the order status before taking action.";
}

export function OnlineOrdersPage() {
  const { token, user, isPreview } = useAuth();
  const canSeeAllBranches = hasGlobalAccess(user?.role_code, user?.permissions);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState(
    canSeeAllBranches ? "all" : user?.branch_id ?? "all",
  );
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [actionNote, setActionNote] = useState("");
  const [tillSession, setTillSession] = useState<TillSession | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const visibleOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) => orderSearchText(order).includes(needle));
  }, [orders, query]);

  const selectedOrder = useMemo(
    () =>
      visibleOrders.find((order) => order.id === selectedOrderId) ??
      visibleOrders[0] ??
      undefined,
    [selectedOrderId, visibleOrders],
  );

  const paymentIssue = useMemo(
    () => paymentFormIssue(selectedOrder, paymentForm, tillSession),
    [paymentForm, selectedOrder, tillSession],
  );

  const totals = useMemo(
    () => ({
      count: visibleOrders.length,
      awaitingPayment: visibleOrders.filter((order) => !isFullyPaid(order)).length,
      ready: visibleOrders.filter((order) => order.fulfillment_status === "ready").length,
      paidAmount: visibleOrders.reduce((sum, order) => sum + numberValue(order.paid_amount), 0),
      outstanding: visibleOrders.reduce((sum, order) => sum + numberValue(order.balance_due), 0),
    }),
    [visibleOrders],
  );

  useEffect(() => {
    if (!canSeeAllBranches && user?.branch_id) {
      setSelectedBranchId(user.branch_id);
    }
  }, [canSeeAllBranches, user?.branch_id]);

  useEffect(() => {
    if (!token || isPreview) {
      setBranches([]);
      setTillSession(null);
      return;
    }

    let active = true;
    Promise.allSettled([listBranches(token), currentTillSession(token)]).then((results) => {
      if (!active) return;
      const [branchResult, tillResult] = results;

      if (branchResult.status === "fulfilled") {
        setBranches(branchResult.value);
      }
      if (tillResult.status === "fulfilled") {
        setTillSession(tillResult.value);
      } else {
        setTillSession(null);
      }
    });

    return () => {
      active = false;
    };
  }, [isPreview, token]);

  useEffect(() => {
    if (!token || isPreview) {
      setOrders([]);
      setSelectedOrderId("");
      if (isPreview) {
        setNotice("Online orders are live-only. Sign in to view website orders.");
      }
      return;
    }

    let active = true;
    setLoading(true);
    listOnlineOrders(token, {
      branchId: selectedBranchId === "all" ? undefined : selectedBranchId,
      status: statusFilter,
      fulfillmentStatus: fulfillmentFilter,
      pageSize: 200,
    })
      .then((page) => {
        if (!active) return;
        setOrders(page.items);
        setSelectedOrderId((current) => {
          if (page.items.some((order) => order.id === current)) return current;
          return page.items[0]?.id ?? "";
        });
      })
      .catch((error) => {
        if (!active) return;
        setOrders([]);
        setSelectedOrderId("");
        setNotice(
          error instanceof Error
            ? error.message
            : "Online orders are unavailable or not permitted for this account.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fulfillmentFilter, isPreview, selectedBranchId, statusFilter, token]);

  useEffect(() => {
    if (!selectedOrder) return;
    setSelectedOrderId(selectedOrder.id);
    setPaymentForm((current) => ({
      ...current,
      amount:
        numberValue(selectedOrder.balance_due) > 0
          ? String(selectedOrder.balance_due)
          : current.amount,
    }));
  }, [selectedOrder?.balance_due, selectedOrder?.id]);

  function mergeOrder(updated: OnlineOrder) {
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
    setSelectedOrderId(updated.id);
  }

  async function refreshOrders() {
    if (!token || isPreview) return;
    setLoading(true);
    try {
      const page = await listOnlineOrders(token, {
        branchId: selectedBranchId === "all" ? undefined : selectedBranchId,
        status: statusFilter,
        fulfillmentStatus: fulfillmentFilter,
        pageSize: 200,
      });
      setOrders(page.items);
      setSelectedOrderId((current) => {
        if (page.items.some((order) => order.id === current)) return current;
        return page.items[0]?.id ?? "";
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not refresh online orders.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedOrder || paymentIssue) {
      setNotice(paymentIssue ?? "Sign in before recording online order payments.");
      return;
    }

    setBusy(true);
    try {
      const payload: OnlineOrderPaymentPayload = {
        method: paymentForm.method,
        amount: paymentForm.amount,
        idempotency_key: `online-order-${selectedOrder.id}-${Date.now()}`,
        notes: paymentForm.notes.trim() || `Payment recorded for ${selectedOrder.order_number}`,
        provider_reference: paymentForm.provider_reference.trim() || null,
        payer_phone: paymentForm.payer_phone.trim() || selectedOrder.customer.phone || null,
        payer_name: paymentForm.payer_name.trim() || selectedOrder.customer.full_name || null,
        payer_account_reference: paymentForm.payer_account_reference.trim() || null,
      };
      if (paymentForm.method === "cash") {
        payload.till_session_id = tillSession?.id ?? null;
      }

      const updated = await recordOnlineOrderPayment(token, selectedOrder.id, payload);
      mergeOrder(updated);
      setPaymentForm({
        ...emptyPaymentForm,
        amount: numberValue(updated.balance_due) > 0 ? String(updated.balance_due) : "",
      });
      setNotice(`Payment recorded for ${updated.order_number}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record payment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOrderAction(
    action: "allocate" | "ready" | "fulfill" | "cancel",
  ) {
    if (!token || !selectedOrder) {
      setNotice("Select an online order first.");
      return;
    }

    setBusy(true);
    try {
      const note = actionNote.trim() || null;
      const updated =
        action === "allocate"
          ? await allocateOnlineOrder(token, selectedOrder.id, {
              auto_assign_serialized_units: true,
              note: note ?? "Stock allocated from online order desk",
            })
          : action === "ready"
            ? await markOnlineOrderReady(token, selectedOrder.id, {
                note: note ?? "Order packed and ready",
              })
            : action === "fulfill"
              ? await fulfillOnlineOrder(token, selectedOrder.id, {
                  note: note ?? "Order fulfilled from online order desk",
                })
              : await cancelOnlineOrder(token, selectedOrder.id, {
                  note: note ?? "Online order cancelled by staff",
                });

      mergeOrder(updated);
      setActionNote("");
      setNotice(`${updated.order_number} updated: ${titleize(updated.fulfillment_status)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update online order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="module-page online-orders-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Website orders</p>
          <h1>Online Orders</h1>
          <p>
            Receive website checkout orders, confirm payment, allocate reserved stock,
            prepare items for pickup or delivery, and close fulfilled orders.
          </p>
        </div>

        <label className="branch-selector">
          <span>Branch</span>
          <select
            name="onlineOrderBranchId"
            value={selectedBranchId}
            disabled={!canSeeAllBranches}
            onChange={(event) => setSelectedBranchId(event.target.value)}
          >
            {canSeeAllBranches && <option value="all">All branches</option>}
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
            {!branches.length && user?.branch_id && (
              <option value={user.branch_id}>Assigned branch</option>
            )}
          </select>
        </label>
      </div>

      <ToastNotice message={notice} onClose={() => setNotice(null)} />

      <section className="online-order-filter-bar">
        <label>
          Search orders
          <input
            name="onlineOrderSearch"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Order no, customer, phone, SKU, branch"
          />
        </label>
        <label>
          Payment
          <select
            name="onlineOrderPaymentStatus"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as OrderStatusFilter)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fulfillment
          <select
            name="onlineOrderFulfillmentStatus"
            value={fulfillmentFilter}
            onChange={(event) =>
              setFulfillmentFilter(event.target.value as FulfillmentFilter)
            }
          >
            {fulfillmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void refreshOrders()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      <div className="stats-grid">
        <article className="metric-card">
          <span>Visible orders</span>
          <strong>{integer(totals.count)}</strong>
          <StatusPill tone="info">Queue</StatusPill>
        </article>
        <article className="metric-card">
          <span>Awaiting payment</span>
          <strong>{integer(totals.awaitingPayment)}</strong>
          <StatusPill tone={totals.awaitingPayment ? "warning" : "success"}>Payment</StatusPill>
        </article>
        <article className="metric-card">
          <span>Ready orders</span>
          <strong>{integer(totals.ready)}</strong>
          <StatusPill tone={totals.ready ? "info" : "neutral"}>Pickup/delivery</StatusPill>
        </article>
        <article className="metric-card">
          <span>Outstanding</span>
          <strong>{money(totals.outstanding)}</strong>
          <StatusPill tone={totals.outstanding ? "warning" : "success"}>
            Paid {money(totals.paidAmount)}
          </StatusPill>
        </article>
      </div>

      <div className="online-order-workspace m-t">
        <section className="panel-card online-order-list-panel">
          <header className="panel-card__header">
            <div>
              <p className="eyebrow">Queue</p>
              <h2>Website order list</h2>
            </div>
            <StatusPill tone={loading ? "warning" : "neutral"}>
              {loading ? "Loading" : `${visibleOrders.length} shown`}
            </StatusPill>
          </header>

          <div className="online-order-table-wrap">
            <table className="data-table data-table--compact">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Branch</th>
                  <th>Payment</th>
                  <th>Fulfillment</th>
                  <th>Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={selectedOrder?.id === order.id ? "is-selected" : ""}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <td>
                      <strong>{order.order_number}</strong>
                      <span>{integer(orderItemCount(order))} item(s)</span>
                    </td>
                    <td>
                      <strong>{order.customer.full_name ?? "Walk-in customer"}</strong>
                      <span>{order.customer.phone ?? "No phone"}</span>
                    </td>
                    <td>{order.branch_name}</td>
                    <td>
                      <StatusPill tone={toneForStatus(order.status)}>
                        {titleize(order.status)}
                      </StatusPill>
                      {numberValue(order.balance_due) > 0 && (
                        <span>{money(order.balance_due)} due</span>
                      )}
                    </td>
                    <td>
                      <StatusPill tone={toneForStatus(order.fulfillment_status)}>
                        {titleize(order.fulfillment_status)}
                      </StatusPill>
                    </td>
                    <td>{money(order.total_amount)}</td>
                    <td>{dateLabel(order.created_at)}</td>
                  </tr>
                ))}
                {!visibleOrders.length && (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      {loading
                        ? "Loading website orders..."
                        : "No online orders match the current filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel-card online-order-detail-panel">
          <header className="panel-card__header">
            <div>
              <p className="eyebrow">Selected order</p>
              <h2>{selectedOrder?.order_number ?? "No order selected"}</h2>
            </div>
            {selectedOrder && (
              <StatusPill tone={toneForStatus(selectedOrder.fulfillment_status)}>
                {titleize(selectedOrder.fulfillment_status)}
              </StatusPill>
            )}
          </header>

          {!selectedOrder ? (
            <p className="empty-panel-message">Select an order from the queue.</p>
          ) : (
            <div className="online-order-detail">
              <div className="selected-ticket-card">
                <strong>{selectedOrder.customer.full_name ?? "Customer not named"}</strong>
                <span>{selectedOrder.customer.phone ?? "No phone recorded"}</span>
                {selectedOrder.customer.email && <span>{selectedOrder.customer.email}</span>}
                <span>
                  {titleize(selectedOrder.delivery_method)}
                  {selectedOrder.delivery_address
                    ? ` - ${selectedOrder.delivery_address}`
                    : " - branch pickup"}
                </span>
                {selectedOrder.customer_note && <span>Note: {selectedOrder.customer_note}</span>}
              </div>

              <div className="online-order-money-strip">
                <div>
                  <span>Total</span>
                  <strong>{money(selectedOrder.total_amount)}</strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>{money(selectedOrder.paid_amount)}</strong>
                </div>
                <div>
                  <span>Balance</span>
                  <strong>{money(selectedOrder.balance_due)}</strong>
                </div>
              </div>

              <p className="online-order-next-step">{orderProgressHint(selectedOrder)}</p>

              <section className="online-order-subsection">
                <h3>Items</h3>
                <table className="data-table data-table--compact">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.description}</strong>
                          <span>
                            {item.sku} - {titleize(item.tracking_type)}
                          </span>
                          {(item.serial_number || item.imei) && (
                            <span>
                              {item.imei ? `IMEI ${item.imei}` : `Serial ${item.serial_number}`}
                            </span>
                          )}
                        </td>
                        <td>{integer(item.quantity)}</td>
                        <td>{money(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="online-order-subsection">
                <h3>Payments</h3>
                {selectedOrder.payments.length ? (
                  <div className="online-order-payment-list">
                    {selectedOrder.payments.map((payment) => (
                      <div key={payment.id} className="online-order-payment-row">
                        <div>
                          <strong>{titleize(payment.method)}</strong>
                          <span>{payment.provider_reference ?? "No reference"}</span>
                        </div>
                        <div>
                          <strong>{money(payment.amount)}</strong>
                          <span>{dateLabel(payment.paid_at ?? payment.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-panel-message">No payment recorded yet.</p>
                )}
              </section>

              {numberValue(selectedOrder.balance_due) > 0 && (
                <form className="action-form" onSubmit={handleRecordPayment}>
                  <h3>Record payment</h3>
                  {paymentForm.method === "cash" && (
                    <p className="field-help">
                      Cash will use{" "}
                      {tillSession
                        ? `open till session from ${dateLabel(tillSession.opened_at)}`
                        : "the signed-in cashier's open till session. None is open right now."}
                    </p>
                  )}
                  <div className="form-grid form-grid--two">
                    <label>
                      Method
                      <select
                        name="onlineOrderPaymentMethod"
                        value={paymentForm.method}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            method: event.target.value as OnlinePaymentMethod,
                          }))
                        }
                      >
                        {paymentMethods.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Amount
                      <input
                        name="onlineOrderPaymentAmount"
                        type="number"
                        min="1"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  {hasReference(paymentForm.method) && (
                    <label>
                      {referenceLabel(paymentForm.method)}
                      <input
                        name="onlineOrderProviderReference"
                        value={paymentForm.provider_reference}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            provider_reference: event.target.value,
                          }))
                        }
                        placeholder="Transaction/reference code"
                      />
                    </label>
                  )}
                  <div className="form-grid form-grid--two">
                    <label>
                      Payer phone
                      <input
                        name="onlineOrderPayerPhone"
                        value={paymentForm.payer_phone}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            payer_phone: event.target.value,
                          }))
                        }
                        placeholder={selectedOrder.customer.phone ?? "Optional"}
                      />
                    </label>
                    <label>
                      Payer name
                      <input
                        name="onlineOrderPayerName"
                        value={paymentForm.payer_name}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            payer_name: event.target.value,
                          }))
                        }
                        placeholder={selectedOrder.customer.full_name ?? "Optional"}
                      />
                    </label>
                  </div>
                  <label>
                    Note
                    <textarea
                      name="onlineOrderPaymentNote"
                      rows={2}
                      value={paymentForm.notes}
                      onChange={(event) =>
                        setPaymentForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Optional payment note"
                    />
                  </label>
                  {paymentIssue && <p className="field-help">{paymentIssue}</p>}
                  <div className="form-footer">
                    <button type="submit" disabled={busy || Boolean(paymentIssue)}>
                      Record payment
                    </button>
                  </div>
                </form>
              )}

              <section className="action-form">
                <h3>Fulfillment actions</h3>
                <label>
                  Staff note
                  <textarea
                    name="onlineOrderActionNote"
                    rows={2}
                    value={actionNote}
                    onChange={(event) => setActionNote(event.target.value)}
                    placeholder="Optional note for audit trail"
                  />
                </label>
                <div className="online-order-action-grid">
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !isFullyPaid(selectedOrder) ||
                      !["unfulfilled", "allocated", "ready"].includes(
                        selectedOrder.fulfillment_status,
                      )
                    }
                    onClick={() => void handleOrderAction("allocate")}
                  >
                    Allocate stock
                  </button>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !isFullyPaid(selectedOrder) ||
                      !["unfulfilled", "allocated"].includes(selectedOrder.fulfillment_status)
                    }
                    onClick={() => void handleOrderAction("ready")}
                  >
                    Mark ready
                  </button>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !isFullyPaid(selectedOrder) ||
                      selectedOrder.fulfillment_status !== "ready"
                    }
                    onClick={() => void handleOrderAction("fulfill")}
                  >
                    Fulfill order
                  </button>
                  <button
                    type="button"
                    className="danger-action"
                    disabled={busy || !canCancelOrder(selectedOrder)}
                    onClick={() => void handleOrderAction("cancel")}
                  >
                    Cancel unpaid
                  </button>
                </div>
              </section>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
