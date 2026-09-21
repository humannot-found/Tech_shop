import { StatusPill } from "../../components/StatusPill";
import { useAuth } from "../../state/auth";
import { dateLabel } from "../../utils/format";
import type { TillController } from "./useTill";
import { money, tillVariance } from "./utils";

type TillPanelsProps = {
  till: TillController;
};

export function TillPanels({
  till,
}: TillPanelsProps) {
  const { token, isPreview } = useAuth();
  const {
    tills,
    selectedTillId,
    setSelectedTillId,
    openingFloat,
    setOpeningFloat,
    closingCash,
    setClosingCash,
    closeTillOpen,
    setCloseTillOpen,
    lastClosedTill,
    tillBusy,
    handleOpenTill,
    handleCloseTill,
    tillSession,
    setCashMovementOpen,
    openShiftReport,
    shiftReportBusy,
  } = till;

  return (
    <>
      {!tillSession && token && !isPreview && (
        <form className="till-open-panel" onSubmit={handleOpenTill}>
          <div>
            <p className="eyebrow">Open till</p>
            <strong>Start cashier session</strong>
            <span>Select a physical till and confirm the opening cash float.</span>
          </div>
          <label>
            Till
            <select
              value={selectedTillId}
              onChange={(event) => setSelectedTillId(event.target.value)}
            >
              <option value="">Select till</option>
              {tills.map((till) => (
                <option key={till.id} value={till.id}>
                  {till.name} / {till.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Opening float
            <input
              type="number"
              min="0"
              value={openingFloat}
              onChange={(event) => setOpeningFloat(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={tillBusy || !tills.length}>
            {tillBusy ? "Opening..." : "Open Till"}
          </button>
        </form>
      )}

      {tillSession && token && !isPreview && (
        <section className="till-close-panel">
          <div>
            <p className="eyebrow">Till session</p>
            <strong>Cashier till is open</strong>
            <span>
              Opened {dateLabel(tillSession.opened_at)} / Float{" "}
              {money(Number(tillSession.opening_float))}
            </span>
          </div>
          {!closeTillOpen ? (
            <div className="till-close-panel__actions">
              <button
                type="button"
                onClick={() => setCashMovementOpen(true)}
              >
                Cash in / out
              </button>
              <button
                type="button"
                disabled={shiftReportBusy}
                onClick={() => void openShiftReport(tillSession.id)}
              >
                Shift report
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setCloseTillOpen(true);
                  setClosingCash(tillSession.expected_cash ?? "");
                }}
              >
                Close Till
              </button>
            </div>
          ) : (
            <form onSubmit={handleCloseTill}>
              <label>
                Counted closing cash
                <input
                  type="number"
                  min="0"
                  value={closingCash}
                  onChange={(event) => setClosingCash(event.target.value)}
                  placeholder="Enter counted cash"
                />
              </label>
              <div className="table-actions">
                <button className="danger-button" disabled={tillBusy}>
                  {tillBusy ? "Closing..." : "Confirm Close"}
                </button>
                <button
                  type="button"
                  onClick={() => setCloseTillOpen(false)}
                  disabled={tillBusy}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {!tillSession && lastClosedTill && (
        <section className="till-close-summary">
          <div>
            <p className="eyebrow">Last till close</p>
            <strong>{dateLabel(lastClosedTill.closed_at)}</strong>
            <span>
              Expected {money(Number(lastClosedTill.expected_cash ?? 0))} / Counted{" "}
              {money(Number(lastClosedTill.closing_cash ?? 0))}
            </span>
          </div>
          <button
            type="button"
            disabled={shiftReportBusy}
            onClick={() => void openShiftReport(lastClosedTill.id)}
          >
            Shift report
          </button>
          <StatusPill
            tone={(tillVariance(lastClosedTill) ?? 0) === 0 ? "success" : "warning"}
          >
            Variance {money(tillVariance(lastClosedTill) ?? 0)}
          </StatusPill>
        </section>
      )}
    </>
  );
}
