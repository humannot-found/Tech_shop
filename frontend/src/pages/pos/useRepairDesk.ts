import { FormEvent, useEffect, useState } from "react";

import {
  addRepairPayment,
  collectRepair,
  getRepairInvoice,
  listRepairPickups,
  manuallyConfirmRepairMpesaPayment,
  queryMpesaPaymentStatus,
  sendRepairMpesaStkPush,
} from "../../api/client";
import type {
  CurrentUser,
  Payment,
  RepairInvoice,
  TillSession,
} from "../../api/types";
import type {
  CollectedRepairSnapshot,
  PosWorkspaceTab,
  RepairPaymentMethod,
} from "./types";
import { idempotencyKey, money, mpesaPollSchedule, wait } from "./utils";

type UseRepairDeskOptions = {
  token: string | null;
  isPreview: boolean;
  user: CurrentUser | null;
  tillSession: TillSession | null;
  setNotice: (message: string | null) => void;
  setActiveWorkspaceTab: (tab: PosWorkspaceTab) => void;
  focusRepairTicketId: string | null;
  onRepairFocusHandled?: () => void;
};

export function useRepairDesk({
  token,
  isPreview,
  user,
  tillSession,
  setNotice,
  setActiveWorkspaceTab,
  focusRepairTicketId,
  onRepairFocusHandled,
}: UseRepairDeskOptions) {
  const [repairPickups, setRepairPickups] = useState<RepairInvoice[]>([]);
  const [selectedRepairInvoice, setSelectedRepairInvoice] =
    useState<RepairInvoice | null>(null);
  const [lastCollectedRepair, setLastCollectedRepair] =
    useState<CollectedRepairSnapshot | null>(null);
  const [repairReceiptViewer, setRepairReceiptViewer] =
    useState<RepairInvoice | null>(null);
  const [repairPickupBusy, setRepairPickupBusy] = useState(false);
  const [repairPaymentMethod, setRepairPaymentMethod] =
    useState<RepairPaymentMethod>("cash");
  const [repairPaymentAmount, setRepairPaymentAmount] = useState("");
  const [repairPaymentReference, setRepairPaymentReference] = useState("");
  const [repairPaymentNotes, setRepairPaymentNotes] = useState("");
  const [repairMpesaPhone, setRepairMpesaPhone] = useState("");
  const [repairMpesaReceiptCode, setRepairMpesaReceiptCode] = useState("");
  const [repairPaymentStatus, setRepairPaymentStatus] = useState<string | null>(null);
  const [repairPendingPayment, setRepairPendingPayment] = useState<Payment | null>(
    null,
  );

  const selectedRepairBalance = Number(selectedRepairInvoice?.balance_due ?? 0);
  const selectedRepairPaid = Number(selectedRepairInvoice?.paid_amount ?? 0);
  const repairPaymentValue = Number(repairPaymentAmount) || 0;
  const selectedRepairIsPaid = Math.round(selectedRepairBalance * 100) === 0;
  const collectRepairIssue = !selectedRepairInvoice
    ? null
    : !token || isPreview
      ? "Live cashier login required before completing device collection."
      : !tillSession
        ? "Open your till before handing over repaired devices."
        : !selectedRepairIsPaid
          ? `Collect the remaining ${money(selectedRepairBalance)} before handover.`
          : null;
  const canCollectSelectedRepair =
    Boolean(selectedRepairInvoice) && !collectRepairIssue;

  function selectRepairPickup(invoice: RepairInvoice) {
    setSelectedRepairInvoice(invoice);
    setLastCollectedRepair(null);
    setActiveWorkspaceTab("repair_pickups");
  }

  async function refreshRepairPickups() {
    if (!token || isPreview || !user?.branch_id) return;
    setRepairPickupBusy(true);
    try {
      const invoices = await listRepairPickups(token, user.branch_id);
      setRepairPickups(invoices);
      setSelectedRepairInvoice((current) => {
        if (!invoices.length) return null;
        if (!current) return invoices[0];
        return (
          invoices.find((invoice) => invoice.ticket_id === current.ticket_id) ??
          invoices[0]
        );
      });
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not load repair pickups for this branch.",
      );
    } finally {
      setRepairPickupBusy(false);
    }
  }

  async function refreshSelectedRepairInvoice(
    ticketId: string,
    message?: string,
    openReceipt = false,
  ) {
    if (!token) throw new Error("Sign in before loading repair invoice.");
    const updatedInvoice = await getRepairInvoice(token, ticketId);
    setSelectedRepairInvoice(updatedInvoice);
    setRepairPickups((current) => {
      if (current.some((invoice) => invoice.ticket_id === updatedInvoice.ticket_id)) {
        return current.map((invoice) =>
          invoice.ticket_id === updatedInvoice.ticket_id ? updatedInvoice : invoice,
        );
      }
      return [updatedInvoice, ...current];
    });
    if (openReceipt) {
      setRepairReceiptViewer(updatedInvoice);
    }
    if (message) {
      setNotice(message);
    }
    return updatedInvoice;
  }

  async function waitForRepairMpesaCompletion(paymentId: string, ticketId: string) {
    if (!token) return false;

    for (let attempt = 0; attempt < mpesaPollSchedule.length; attempt += 1) {
      const delay = mpesaPollSchedule[attempt];
      setRepairPaymentStatus(
        `M-Pesa prompt sent. Checking repair payment ${attempt + 1}/${mpesaPollSchedule.length}...`,
      );
      await wait(delay);
      const result = await queryMpesaPaymentStatus(token, paymentId);
      setRepairPendingPayment(result.payment);
      setRepairPaymentStatus(result.customer_message);

      if (result.payment.status === "completed") {
        await refreshSelectedRepairInvoice(
          ticketId,
          "Repair M-Pesa payment received and receipt generated.",
          true,
        );
        setRepairPendingPayment(null);
        setRepairMpesaReceiptCode("");
        return true;
      }

      if (["failed", "cancelled"].includes(result.payment.status)) {
        return false;
      }
    }

    return false;
  }

  async function manuallyCompleteRepairMpesaPayment() {
    if (!selectedRepairInvoice || !token || isPreview) {
      setNotice("Select a live repair invoice first.");
      return;
    }
    if (!repairMpesaReceiptCode.trim()) {
      setNotice("Enter the M-Pesa receipt code from the customer's SMS.");
      return;
    }

    setRepairPickupBusy(true);
    setRepairPaymentStatus("Confirming repair M-Pesa receipt code...");
    try {
      await manuallyConfirmRepairMpesaPayment(
        token,
        selectedRepairInvoice.ticket_id,
        {
          provider_reference: repairMpesaReceiptCode.trim(),
          notes: "Cashier confirmed delayed repair M-Pesa callback from customer SMS.",
        },
      );
      await refreshSelectedRepairInvoice(
        selectedRepairInvoice.ticket_id,
        "Repair M-Pesa payment manually confirmed and receipt generated.",
        true,
      );
      setRepairPendingPayment(null);
      setRepairMpesaReceiptCode("");
      setRepairPaymentStatus(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not confirm repair M-Pesa payment.";
      setNotice(message);
      setRepairPaymentStatus(message);
    } finally {
      setRepairPickupBusy(false);
    }
  }

  async function recordRepairPickupPayment(event: FormEvent) {
    event.preventDefault();
    if (!selectedRepairInvoice) {
      setNotice("Select a ready repair invoice first.");
      return;
    }
    if (!token || isPreview) {
      setNotice("Preview mode cannot record live repair payments.");
      return;
    }
    if (!tillSession) {
      setNotice("Open your till before receiving repair payments.");
      return;
    }
    if (repairPaymentValue <= 0) {
      setNotice("Enter a repair payment amount greater than zero.");
      return;
    }
    if (repairPaymentValue > selectedRepairBalance) {
      setNotice("Repair payment cannot exceed the remaining balance.");
      return;
    }
    if (repairPaymentMethod === "card" && !repairPaymentReference.trim()) {
      setNotice("Enter the card payment reference.");
      return;
    }
    if (
      repairPaymentMethod === "mpesa" &&
      !repairPaymentReference.trim() &&
      !repairMpesaPhone.trim()
    ) {
      setNotice("Enter the customer's M-Pesa phone or receipt code.");
      return;
    }

    setRepairPickupBusy(true);
    setRepairPaymentStatus(null);
    try {
      if (repairPaymentMethod === "mpesa" && !repairPaymentReference.trim()) {
        setRepairPaymentStatus("Sending repair M-Pesa prompt to customer...");
        const prompt = await sendRepairMpesaStkPush(
          token,
          selectedRepairInvoice.ticket_id,
          {
            till_session_id: tillSession.id,
            phone_number: repairMpesaPhone.trim(),
            amount: repairPaymentValue,
            idempotency_key: idempotencyKey(),
            notes:
              repairPaymentNotes.trim() ||
              `Repair pickup M-Pesa payment for ${selectedRepairInvoice.ticket_number}`,
          },
        );
        setRepairPendingPayment(prompt.payment);
        setRepairPaymentStatus(prompt.customer_message);
        setNotice(prompt.customer_message);
        const completed = await waitForRepairMpesaCompletion(
          prompt.payment.id,
          selectedRepairInvoice.ticket_id,
        );
        if (!completed) {
          setRepairPaymentStatus(
            "M-Pesa prompt sent. Waiting for callback or manual confirmation.",
          );
          setNotice(
            "Repair M-Pesa prompt sent. If the customer has paid but the receipt is not generated, enter their M-Pesa receipt code below.",
          );
        }
        return;
      }

      await addRepairPayment(token, selectedRepairInvoice.ticket_id, {
        till_session_id: tillSession.id,
        method: repairPaymentMethod,
        amount: repairPaymentValue,
        provider_reference:
          repairPaymentMethod === "cash" ? null : repairPaymentReference.trim(),
        payer_phone:
          repairPaymentMethod === "mpesa"
            ? repairMpesaPhone.trim() || selectedRepairInvoice.customer_phone
            : selectedRepairInvoice.customer_phone,
        payer_name: selectedRepairInvoice.customer_name,
        payer_account_reference: selectedRepairInvoice.ticket_number,
        idempotency_key: idempotencyKey(),
        notes: repairPaymentNotes.trim() || "Repair pickup payment received at POS",
      });
      const updatedInvoice = await refreshSelectedRepairInvoice(
        selectedRepairInvoice.ticket_id,
        undefined,
        true,
      );
      setRepairPendingPayment(null);
      setRepairMpesaReceiptCode("");
      setRepairPaymentStatus(null);
      setNotice(
        Number(updatedInvoice.balance_due) === 0
          ? `${updatedInvoice.ticket_number} fully paid. Hand over the device to complete collection.`
          : `Payment recorded for ${updatedInvoice.ticket_number}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not record repair payment.",
      );
    } finally {
      setRepairPickupBusy(false);
    }
  }

  async function completeRepairPickup() {
    if (!selectedRepairInvoice) {
      setNotice("Select a ready repair invoice first.");
      return;
    }
    if (!token || isPreview) {
      setNotice("Preview mode cannot complete live repair collections.");
      return;
    }
    if (!tillSession) {
      setNotice("Open your till before handing over repaired devices.");
      return;
    }
    if (selectedRepairBalance > 0) {
      setNotice("Repair invoice must be fully paid before collection.");
      return;
    }

    setRepairPickupBusy(true);
    try {
      const collectedInvoice = selectedRepairInvoice;
      const collection = await collectRepair(token, selectedRepairInvoice.ticket_id);
      setRepairPickups((current) =>
        current.filter((invoice) => invoice.ticket_id !== collection.ticket_id),
      );
      setSelectedRepairInvoice(null);
      setLastCollectedRepair({
        ...collection,
        invoice: collectedInvoice,
      });
      setNotice(`${collection.ticket_number} collected. Device handover is complete.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not complete repair collection.",
      );
    } finally {
      setRepairPickupBusy(false);
    }
  }

  useEffect(() => {
    void refreshRepairPickups();
  }, [isPreview, token, user?.branch_id]);

  useEffect(() => {
    if (!focusRepairTicketId) return;

    setActiveWorkspaceTab("repair_pickups");

    if (!token || isPreview) {
      onRepairFocusHandled?.();
      return;
    }

    let active = true;
    setRepairPickupBusy(true);
    getRepairInvoice(token, focusRepairTicketId)
      .then((invoice) => {
        if (!active) return;

        setSelectedRepairInvoice(invoice);
        setLastCollectedRepair(null);
        setRepairPickups((current) => {
          if (current.some((item) => item.ticket_id === invoice.ticket_id)) {
            return current.map((item) =>
              item.ticket_id === invoice.ticket_id ? invoice : item,
            );
          }

          return [invoice, ...current];
        });
        setNotice(`${invoice.ticket_number} opened in POS repair payment desk.`);
      })
      .catch((error) => {
        if (!active) return;
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not open repair payment in POS.",
        );
      })
      .finally(() => {
        if (!active) return;
        setRepairPickupBusy(false);
        onRepairFocusHandled?.();
      });

    return () => {
      active = false;
    };
  }, [focusRepairTicketId, isPreview, onRepairFocusHandled, token]);

  useEffect(() => {
    if (!selectedRepairInvoice) {
      setRepairPaymentAmount("");
      setRepairMpesaPhone("");
      setRepairMpesaReceiptCode("");
      setRepairPendingPayment(null);
      setRepairPaymentStatus(null);
      return;
    }
    setRepairPaymentAmount(
      Number(selectedRepairInvoice.balance_due) > 0
        ? String(Number(selectedRepairInvoice.balance_due))
        : "",
    );
    setRepairPaymentReference("");
    setRepairPaymentNotes("");
    setRepairMpesaPhone(selectedRepairInvoice.customer_phone ?? "");
    setRepairMpesaReceiptCode("");
    setRepairPendingPayment(null);
    setRepairPaymentStatus(null);
  }, [selectedRepairInvoice?.ticket_id, selectedRepairInvoice?.balance_due]);

  return {
    repairPickups,
    selectedRepairInvoice,
    lastCollectedRepair,
    setLastCollectedRepair,
    repairReceiptViewer,
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
  };
}

export type RepairDeskController = ReturnType<typeof useRepairDesk>;
