import { useState } from "react";

import type { SerializedUnit } from "../../api/types";
import type { CartItem, DiscountMode, PaymentMethod } from "./types";
import { lineDiscountFromInput, money, unitLabel } from "./utils";

type OrderPanelProps = {
  cart: CartItem[];
  heldOrderCount: number;
  onShowHeldOrders: () => void;
  onNewOrder: () => void;
  customerName: string;
  customerPhone: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  checkoutIsReady: boolean;
  missingSerializedUnits: number;
  hasTillOrPreview: boolean;
  cartUnitCount: number;
  subtotal: number;
  discount: number;
  total: number;
  serializedUnitsByVariant: Record<string, SerializedUnit[]>;
  updateSerializedUnit: (lineId: string, unitId: string) => void;
  updateQuantity: (lineId: string, delta: number) => void;
  setLineDiscount: (lineId: string, discountAmount: number) => void;
  openPaymentWithMethod: (method: PaymentMethod) => void;
  openPayment: () => void;
  clearCurrentCart: () => void;
  holdCurrentOrder: () => void;
};

export function OrderPanel({
  cart,
  heldOrderCount,
  onShowHeldOrders,
  onNewOrder,
  customerName,
  customerPhone,
  onCustomerNameChange,
  onCustomerPhoneChange,
  checkoutIsReady,
  missingSerializedUnits,
  hasTillOrPreview,
  cartUnitCount,
  subtotal,
  discount,
  total,
  serializedUnitsByVariant,
  updateSerializedUnit,
  updateQuantity,
  setLineDiscount,
  openPaymentWithMethod,
  openPayment,
  clearCurrentCart,
  holdCurrentOrder,
}: OrderPanelProps) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);

  function openDiscountEditor(item: CartItem) {
    if (editingLineId === item.lineId) {
      setEditingLineId(null);
      return;
    }
    setEditingLineId(item.lineId);
    setDiscountMode("amount");
    setDiscountValue(item.discountAmount > 0 ? String(item.discountAmount) : "");
    setDiscountError(null);
  }

  function applyDiscount(item: CartItem) {
    const result = lineDiscountFromInput(
      discountMode,
      discountValue,
      item.price * item.quantity,
    );
    if ("error" in result) {
      setDiscountError(result.error);
      return;
    }
    setLineDiscount(item.lineId, result.amount);
    setEditingLineId(null);
  }

  return (
    <aside className="pos-order-panel">
      <header className="order-tabs">
        <button className="orders-tab is-active">
          <strong>Order 1</strong>
          <span>{cart.length || 0} items</span>
        </button>
        <button
          className="orders-tab"
          onClick={() => onShowHeldOrders()}
        >
          <strong>Held</strong>
          <span>{heldOrderCount} orders</span>
        </button>
        <button
          className="orders-tab orders-tab--add"
          type="button"
          onClick={onNewOrder}
          title="Start a new blank order"
        >
          +
        </button>
      </header>

      <div className="customer-strip customer-strip--editable">
        <label>
          <span>Customer name</span>
          <input
            value={customerName}
            onChange={(event) => {
              onCustomerNameChange(event.target.value);
            }}
            placeholder="Walk-in customer"
          />
        </label>
        <label>
          <span>Phone for receipt</span>
          <input
            value={customerPhone}
            onChange={(event) => {
              onCustomerPhoneChange(event.target.value);
            }}
            placeholder="0712 345 678"
          />
        </label>
      </div>

      <div className="order-status-strip">
        <span>
          <strong>{cart.length}</strong> line(s)
        </span>
        <span>
          <strong>{cartUnitCount}</strong> unit(s)
        </span>
        <span>
          <strong>{money(total)}</strong> total
        </span>
        <span className={checkoutIsReady ? "is-ready" : "is-warning"}>
          {checkoutIsReady
            ? "Ready"
            : missingSerializedUnits
              ? `${missingSerializedUnits} serial needed`
              : hasTillOrPreview
                ? "Add items"
                : "Open till"}
        </span>
      </div>

      <div className="order-list">
        {cart.length === 0 && (
          <div className="empty-order">
            <strong>No items selected</strong>
            <span>Search, scan, or choose a category to start selling.</span>
          </div>
        )}

        {cart.map((item) => (
          <article className="order-line" key={item.lineId}>
            <div className="order-line__qty">
              <strong>{item.quantity}</strong>
              <span>
                {item.trackingType === "bulk" ? "Unit(s)" : item.trackingType.toUpperCase()}
              </span>
            </div>
            <div className="order-line__meta">
              <div>
                <h3>{item.name}</h3>
                <strong>
                  {item.discountAmount > 0 && (
                    <s className="order-line__was">
                      {money(item.price * item.quantity)}
                    </s>
                  )}
                  {money(item.price * item.quantity - item.discountAmount)}
                </strong>
              </div>
              <small>
                {item.sku} / {item.variantName}
              </small>

              {item.trackingType !== "bulk" && (
                <label className="serial-select">
                  IMEI / serial
                  <select
                    value={item.serializedUnitId ?? ""}
                    onChange={(event) =>
                      updateSerializedUnit(item.lineId, event.target.value)
                    }
                  >
                    <option value="">Select unit</option>
                    {(serializedUnitsByVariant[item.variantId] ?? []).map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unitLabel(unit)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="order-line__controls">
                <button onClick={() => updateQuantity(item.lineId, -1)}>
                  -
                </button>
                <button onClick={() => updateQuantity(item.lineId, 1)}>
                  +
                </button>
                <button onClick={() => updateQuantity(item.lineId, -item.quantity)}>
                  Remove
                </button>
                <button
                  type="button"
                  className={item.discountAmount > 0 ? "is-active" : ""}
                  onClick={() => openDiscountEditor(item)}
                >
                  {item.discountAmount > 0
                    ? `Discount -${money(item.discountAmount)}`
                    : "Discount"}
                </button>
              </div>

              {editingLineId === item.lineId && (
                <form
                  className="line-discount-editor"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyDiscount(item);
                  }}
                >
                  <select
                    aria-label="Discount type"
                    value={discountMode}
                    onChange={(event) => {
                      setDiscountMode(event.target.value as DiscountMode);
                      setDiscountError(null);
                    }}
                  >
                    <option value="percent">Percent off (%)</option>
                    <option value="amount">Amount off (KES)</option>
                    <option value="price">New line price (KES)</option>
                  </select>
                  <input
                    aria-label="Discount value"
                    type="number"
                    min="0"
                    step="any"
                    autoFocus
                    value={discountValue}
                    onChange={(event) => {
                      setDiscountValue(event.target.value);
                      setDiscountError(null);
                    }}
                  />
                  <button type="submit" className="success-button">
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLineDiscount(item.lineId, 0);
                      setEditingLineId(null);
                    }}
                  >
                    Clear
                  </button>
                  {discountError && (
                    <span className="line-discount-editor__error">{discountError}</span>
                  )}
                </form>
              )}
            </div>
          </article>
        ))}
      </div>

      <footer className="order-footer">
        <div className="order-summary">
          <div>
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>{money(discount)}</strong>
          </div>
          <div className="order-summary__total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
        </div>

          <div className="quick-payment-actions" aria-label="Quick payment methods">
          <button type="button" onClick={() => openPaymentWithMethod("cash")}>
            Cash
          </button>
          <button type="button" onClick={() => openPaymentWithMethod("mpesa")}>
            M-Pesa
          </button>
          <button type="button" onClick={() => openPaymentWithMethod("card")}>
            Card
          </button>
          <button type="button" onClick={() => openPaymentWithMethod("split")}>
            Split
          </button>
        </div>

        <div className="order-actions">
          <button className="danger-button" onClick={clearCurrentCart}>
            Clear Cart
          </button>
          <button onClick={holdCurrentOrder} title="Hold order (Alt+H)">
            Hold
          </button>
          <button className="success-button" onClick={openPayment}>
            Payment
          </button>
        </div>
      </footer>
    </aside>
  );
}
