import { StatusPill } from "../../components/StatusPill";
import { dateLabel } from "../../utils/format";
import type { SaleAdjustmentsController } from "./useSaleAdjustments";
import { money } from "./utils";

type ApprovalsTabProps = {
  adjustments: SaleAdjustmentsController;
};

export function ApprovalsTab({ adjustments }: ApprovalsTabProps) {
  const {
    pendingReturns,
    pendingVoids,
    approvalSales,
    approvalsBusy,
    refreshApprovals,
    decideReturn,
    decideVoid,
  } = adjustments;

  function invoiceFor(saleId: string) {
    return approvalSales[saleId]?.invoice_number ?? `Sale ${saleId.slice(0, 8)}`;
  }

  const empty = pendingReturns.length === 0 && pendingVoids.length === 0;

  return (
    <section className="pos-approvals-workspace">
      <header className="pos-approvals-header">
        <div>
          <p className="eyebrow">Manager approvals</p>
          <strong>Returns and voids waiting for a decision</strong>
        </div>
        <button onClick={() => void refreshApprovals()} disabled={approvalsBusy}>
          {approvalsBusy ? "Loading..." : "Refresh"}
        </button>
      </header>

      {empty && (
        <div className="pos-empty-state">
          <strong>Nothing waiting</strong>
          <span>Return and void requests from cashiers appear here.</span>
        </div>
      )}

      {pendingReturns.map((item) => (
        <article className="approval-card" key={item.id}>
          <div>
            <p className="eyebrow">Return {item.return_number}</p>
            <strong>{invoiceFor(item.sale_id)}</strong>
            <span>
              {item.items.length} item line(s) / {item.reason}
            </span>
            <span>{dateLabel(item.created_at)}</span>
          </div>
          <StatusPill tone="warning">
            Refund {money(Number(item.refund_amount))}
          </StatusPill>
          <div className="approval-card__actions">
            <button
              className="success-button"
              disabled={approvalsBusy}
              onClick={() => void decideReturn(item, true)}
            >
              Approve
            </button>
            <button
              className="danger-button"
              disabled={approvalsBusy}
              onClick={() => void decideReturn(item, false)}
            >
              Reject
            </button>
          </div>
        </article>
      ))}

      {pendingVoids.map((item) => {
        const sale = approvalSales[item.resource_id];
        return (
          <article className="approval-card" key={item.id}>
            <div>
              <p className="eyebrow">Void sale</p>
              <strong>{invoiceFor(item.resource_id)}</strong>
              <span>{item.reason}</span>
              <span>{dateLabel(item.created_at)}</span>
            </div>
            <StatusPill tone="danger">
              {sale ? `Refund ${money(Number(sale.paid_amount))}` : "Void"}
            </StatusPill>
            <div className="approval-card__actions">
              <button
                className="success-button"
                disabled={approvalsBusy}
                onClick={() => void decideVoid(item, true)}
              >
                Approve
              </button>
              <button
                className="danger-button"
                disabled={approvalsBusy}
                onClick={() => void decideVoid(item, false)}
              >
                Reject
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
