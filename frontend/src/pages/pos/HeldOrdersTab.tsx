import { dateLabel } from "../../utils/format";
import type { HeldOrder } from "./types";
import { money } from "./utils";

type HeldOrdersTabProps = {
  heldOrders: HeldOrder[];
  onResume: (order: HeldOrder) => void;
  onDiscard: (orderId: string) => void;
};

export function HeldOrdersTab({
  heldOrders,
  onResume,
  onDiscard,
}: HeldOrdersTabProps) {
  return (
    <section className="pos-held-workspace">
      {heldOrders.length === 0 && (
        <div className="pos-empty-state">
          <strong>No held orders</strong>
          <span>
            Use Hold on the cart when a customer pauses checkout, then resume
            from here.
          </span>
        </div>
      )}

      {heldOrders.length > 0 && (
        <div className="held-orders-list">
          {heldOrders.map((order) => (
            <article className="held-order-card" key={order.id}>
              <div>
                <p className="eyebrow">Held order</p>
                <strong>{order.label}</strong>
                <span>
                  {order.cart.length} line(s) / {money(order.total)}
                </span>
                <span>{dateLabel(order.createdAt)}</span>
                {order.customerPhone && <span>{order.customerPhone}</span>}
              </div>
              <div className="held-order-actions">
                <button type="button" onClick={() => onResume(order)}>
                  Resume
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => onDiscard(order.id)}
                >
                  Discard
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
