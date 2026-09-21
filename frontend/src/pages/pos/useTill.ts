import { FormEvent, useEffect, useState } from "react";

import {
  closeTillSession,
  listCashMovements,
  openTillSession,
  recordCashMovement,
} from "../../api/client";
import type {
  CurrentUser,
  Till,
  TillCashMovement,
  TillCashMovementPayload,
  TillSession,
} from "../../api/types";
import { money, tillVariance } from "./utils";

type UseTillOptions = {
  token: string | null;
  isPreview: boolean;
  user: CurrentUser | null;
  setNotice: (message: string | null) => void;
  getCloseBlocker: () => string | null;
  onClosed: () => void;
};

export function useTill({
  token,
  isPreview,
  user,
  setNotice,
  getCloseBlocker,
  onClosed,
}: UseTillOptions) {
  const [tillSession, setTillSession] = useState<TillSession | null>(null);
  const [tills, setTills] = useState<Till[]>([]);
  const [selectedTillId, setSelectedTillId] = useState("");
  const [openingFloat, setOpeningFloat] = useState("1000");
  const [closingCash, setClosingCash] = useState("");
  const [closeTillOpen, setCloseTillOpen] = useState(false);
  const [lastClosedTill, setLastClosedTill] = useState<TillSession | null>(null);
  const [tillBusy, setTillBusy] = useState(false);

  const [cashMovements, setCashMovements] = useState<TillCashMovement[]>([]);
  const [cashMovementOpen, setCashMovementOpen] = useState(false);
  const [cashMovementBusy, setCashMovementBusy] = useState(false);

  useEffect(() => {
    if (!token || isPreview || !tillSession) {
      setCashMovements([]);
      return;
    }
    let active = true;
    listCashMovements(token, tillSession.id)
      .then((items) => {
        if (active) setCashMovements(items);
      })
      .catch(() => {
        if (active) setCashMovements([]);
      });
    return () => {
      active = false;
    };
  }, [token, isPreview, tillSession?.id]);

  async function submitCashMovement(
    kind: TillCashMovementPayload["kind"],
    amount: number,
    reason: string,
  ) {
    if (!token || isPreview || !tillSession) {
      setNotice("Open a live till session before recording cash movements.");
      return false;
    }
    setCashMovementBusy(true);
    try {
      const created = await recordCashMovement(token, tillSession.id, {
        kind,
        amount,
        reason,
      });
      setCashMovements((current) => [created, ...current]);
      setNotice(`${money(Number(created.amount))} recorded.`);
      return true;
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not record the cash movement.",
      );
      return false;
    } finally {
      setCashMovementBusy(false);
    }
  }

  async function handleOpenTill(event: FormEvent) {
    event.preventDefault();
    if (!token || isPreview) {
      setNotice("Preview mode does not need a live till session.");
      return;
    }
    if (!user?.branch_id) {
      setNotice("This user is not scoped to a branch. Use a branch cashier or manager to open POS.");
      return;
    }
    if (!selectedTillId) {
      setNotice("Select a till before opening a session.");
      return;
    }

    setTillBusy(true);
    try {
      const session = await openTillSession(token, {
        till_id: selectedTillId,
        opening_float: Number(openingFloat) || 0,
      });
      setTillSession(session);
      setNotice(`Till opened with ${money(Number(session.opening_float))} float.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open till session.");
    } finally {
      setTillBusy(false);
    }
  }

  async function handleCloseTill(event: FormEvent) {
    event.preventDefault();
    if (!token || isPreview || !tillSession) {
      setNotice("No live till session is open.");
      return;
    }
    const closeBlocker = getCloseBlocker();
    if (closeBlocker) {
      setNotice(closeBlocker);
      return;
    }
    if (closingCash.trim() === "") {
      setNotice("Enter the counted closing cash before closing the till.");
      return;
    }

    setTillBusy(true);
    try {
      const closed = await closeTillSession(token, tillSession.id, {
        closing_cash: Number(closingCash) || 0,
      });
      const variance = tillVariance(closed);
      setLastClosedTill(closed);
      setTillSession(null);
      setCloseTillOpen(false);
      setClosingCash("");
      setNotice(
        `Till closed. Expected ${money(Number(closed.expected_cash ?? 0))}, counted ${money(
          Number(closed.closing_cash ?? 0),
        )}, variance ${money(variance ?? 0)}.`,
      );
      onClosed();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not close till session.");
    } finally {
      setTillBusy(false);
    }
  }

  return {
    tillSession,
    setTillSession,
    tills,
    setTills,
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
    cashMovements,
    cashMovementOpen,
    setCashMovementOpen,
    cashMovementBusy,
    submitCashMovement,
  };
}

export type TillController = ReturnType<typeof useTill>;
