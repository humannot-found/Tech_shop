import { useEffect, useState } from "react";

import {
  decideSaleReturn,
  decideSaleVoid,
  getPosSale,
  listBranchReturns,
  listSaleReturns,
  listVoidRequests,
  requestSaleReturn,
  requestSaleVoid,
} from "../../api/client";
import type {
  ApprovalRequest,
  CurrentUser,
  PosSale,
  SaleReturn,
  SaleReturnPayload,
  TillSession,
} from "../../api/types";
import { canReviewAdjustments, money } from "./utils";

type UseSaleAdjustmentsOptions = {
  token: string | null;
  isPreview: boolean;
  user: CurrentUser | null;
  tillSession: TillSession | null;
  knownSales: PosSale[];
  setNotice: (message: string | null) => void;
  onChanged: () => void;
};

export function useSaleAdjustments({
  token,
  isPreview,
  user,
  tillSession,
  knownSales,
  setNotice,
  onChanged,
}: UseSaleAdjustmentsOptions) {
  const [returnSale, setReturnSale] = useState<PosSale | null>(null);
  const [returnHistory, setReturnHistory] = useState<SaleReturn[]>([]);
  const [voidSale, setVoidSale] = useState<PosSale | null>(null);
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [pendingReturns, setPendingReturns] = useState<SaleReturn[]>([]);
  const [pendingVoids, setPendingVoids] = useState<ApprovalRequest[]>([]);
  const [approvalSales, setApprovalSales] = useState<Record<string, PosSale>>({});
  const [approvalsBusy, setApprovalsBusy] = useState(false);

  const canReview = canReviewAdjustments(user);
  const branchId = user?.branch_id ?? null;
  const pendingCount = pendingReturns.length + pendingVoids.length;

  function requestBlocker() {
    if (!token || isPreview) return "Preview mode cannot record returns or voids.";
    if (!tillSession) return "Open your till before requesting a return or void.";
    return null;
  }

  async function openReturn(sale: PosSale) {
    const blocker = requestBlocker();
    if (blocker || !token) {
      setNotice(blocker);
      return;
    }
    setAdjustBusy(true);
    try {
      setReturnHistory(await listSaleReturns(token, sale.id));
      setReturnSale(sale);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open the return form.");
    } finally {
      setAdjustBusy(false);
    }
  }

  function openVoid(sale: PosSale) {
    const blocker = requestBlocker();
    if (blocker) {
      setNotice(blocker);
      return;
    }
    setVoidSale(sale);
  }

  async function submitReturn(items: SaleReturnPayload["items"], reason: string) {
    if (!token || !returnSale || !tillSession) return;
    setAdjustBusy(true);
    try {
      const created = await requestSaleReturn(token, returnSale.id, {
        till_session_id: tillSession.id,
        reason,
        items,
      });
      setNotice(
        `Return ${created.return_number} for ${money(Number(created.refund_amount))} sent for manager approval.`,
      );
      setReturnSale(null);
      void refreshApprovals();
      onChanged();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not request the return.");
    } finally {
      setAdjustBusy(false);
    }
  }

  async function submitVoid(reason: string) {
    if (!token || !voidSale || !tillSession) return;
    setAdjustBusy(true);
    try {
      await requestSaleVoid(token, voidSale.id, {
        till_session_id: tillSession.id,
        reason,
      });
      setNotice(`Void for ${voidSale.invoice_number} sent for manager approval.`);
      setVoidSale(null);
      void refreshApprovals();
      onChanged();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not request the void.");
    } finally {
      setAdjustBusy(false);
    }
  }

  async function refreshApprovals() {
    if (!token || isPreview || !branchId || !canReview) return;
    setApprovalsBusy(true);
    try {
      const [returns, voids] = await Promise.all([
        listBranchReturns(token, branchId, "pending"),
        listVoidRequests(token, branchId),
      ]);
      const pendingVoidRequests = voids.filter((item) => item.status === "pending");
      setPendingReturns(returns);
      setPendingVoids(pendingVoidRequests);

      const wanted = new Set([
        ...returns.map((item) => item.sale_id),
        ...pendingVoidRequests.map((item) => item.resource_id),
      ]);
      const sales: Record<string, PosSale> = {};
      for (const sale of knownSales) {
        if (wanted.has(sale.id)) sales[sale.id] = sale;
      }
      await Promise.all(
        [...wanted]
          .filter((id) => !sales[id])
          .map(async (id) => {
            try {
              sales[id] = await getPosSale(token, id);
            } catch {
              // The card falls back to a short id if the sale cannot be loaded.
            }
          }),
      );
      setApprovalSales(sales);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load approvals.");
    } finally {
      setApprovalsBusy(false);
    }
  }

  async function decideReturn(item: SaleReturn, approved: boolean) {
    if (!token) return;
    setApprovalsBusy(true);
    try {
      await decideSaleReturn(token, item.id, { approved });
      setNotice(
        approved
          ? `${item.return_number} approved. Refund of ${money(Number(item.refund_amount))} recorded.`
          : `${item.return_number} rejected.`,
      );
      onChanged();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record the decision.");
    } finally {
      setApprovalsBusy(false);
      void refreshApprovals();
    }
  }

  async function decideVoid(item: ApprovalRequest, approved: boolean) {
    if (!token) return;
    setApprovalsBusy(true);
    try {
      await decideSaleVoid(token, item.id, { approved });
      setNotice(approved ? "Sale void approved." : "Sale void rejected.");
      onChanged();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record the decision.");
    } finally {
      setApprovalsBusy(false);
      void refreshApprovals();
    }
  }

  useEffect(() => {
    void refreshApprovals();
  }, [token, isPreview, branchId, canReview]);

  return {
    canReview,
    pendingCount,
    returnSale,
    returnHistory,
    closeReturn: () => setReturnSale(null),
    voidSale,
    closeVoid: () => setVoidSale(null),
    adjustBusy,
    pendingReturns,
    pendingVoids,
    approvalSales,
    approvalsBusy,
    openReturn,
    openVoid,
    submitReturn,
    submitVoid,
    refreshApprovals,
    decideReturn,
    decideVoid,
  };
}

export type SaleAdjustmentsController = ReturnType<typeof useSaleAdjustments>;
