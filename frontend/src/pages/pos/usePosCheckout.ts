import { useState } from "react";

import {
  addSalePayment,
  cancelPosSale,
  createCustomer,
  createPosSale,
  getPosSale,
  getSaleReceipt,
  listCustomers,
  listSalePayments,
  manuallyConfirmMpesaPayment,
  markPaymentAttemptOutcome,
  queryMpesaPaymentStatus,
  recordFailedPaymentAttempt,
  sendMpesaStkPush,
} from "../../api/client";
import type {
  CurrentUser,
  DiscountApprovalPayload,
  Customer,
  Payment,
  PosProduct,
  PosSale,
  Receipt,
  SerializedUnit,
  StatusTone,
  TillSession,
} from "../../api/types";
import type {
  CartItem,
  HeldOrder,
  PaymentMethod,
  PosWorkspaceTab,
  SplitMethod,
} from "./types";
import {
  canDiscountWithoutApproval,
  idempotencyKey,
  money,
  mpesaPollSchedule,
  splitBalanceState,
  wait,
} from "./utils";

type UsePosCheckoutOptions = {
  token: string | null;
  isPreview: boolean;
  user: CurrentUser | null;
  tillSession: TillSession | null;
  catalogLive: boolean;
  setNotice: (message: string | null) => void;
  setActiveWorkspaceTab: (tab: PosWorkspaceTab) => void;
  setActiveCategory: (category: string) => void;
  setQuery: (query: string) => void;
  setHistoryBusy: (busy: boolean) => void;
  serializedUnitsByVariant: Record<string, SerializedUnit[]>;
  refreshRecentSales: () => Promise<void>;
};

export function usePosCheckout({
  token,
  isPreview,
  user,
  tillSession,
  catalogLive,
  setNotice,
  setActiveWorkspaceTab,
  setActiveCategory,
  setQuery,
  setHistoryBusy,
  serializedUnitsByVariant,
  refreshRecentSales,
}: UsePosCheckoutOptions) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaReceiptCode, setMpesaReceiptCode] = useState("");
  const [splitAmounts, setSplitAmounts] = useState<Record<SplitMethod, string>>({
    cash: "",
    mpesa: "",
    card: "",
  });
  const [splitCardReference, setSplitCardReference] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentAttempts, setPaymentAttempts] = useState<Payment[]>([]);
  const [attemptsBusy, setAttemptsBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptViewer, setReceiptViewer] = useState<Receipt | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [pendingSale, setPendingSale] = useState<PosSale | null>(null);
  const [discountApproval, setDiscountApproval] =
    useState<DiscountApprovalPayload | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const discount = cart.reduce((total, item) => total + item.discountAmount, 0);
  const total = Math.max(0, subtotal - discount);
  const paymentSubtotal = pendingSale ? Number(pendingSale.subtotal) : subtotal;
  const paymentDiscount = pendingSale ? Number(pendingSale.discount_amount) : discount;
  const paymentTotal = pendingSale ? Number(pendingSale.total_amount) : total;
  const paymentOutstanding = pendingSale
    ? Math.max(0, Number(pendingSale.total_amount) - Number(pendingSale.paid_amount))
    : paymentTotal;
  const currentPaymentAttempts = pendingSale
    ? paymentAttempts.filter((payment) => payment.sale_id === pendingSale.id)
    : [];
  const pendingMpesaAttempt = currentPaymentAttempts.find(
    (payment) => payment.method === "mpesa" && payment.status === "pending",
  );
  const isRecoveringPendingSale = Boolean(pendingSale && cart.length === 0);
  const splitCashAmount = Number(splitAmounts.cash) || 0;
  const splitMpesaAmount = Number(splitAmounts.mpesa) || 0;
  const splitCardAmount = Number(splitAmounts.card) || 0;
  const splitTotal = splitCashAmount + splitMpesaAmount + splitCardAmount;
  const splitBalance = paymentOutstanding - splitTotal;
  const splitState = splitBalanceState(splitBalance);
  const splitTone: StatusTone =
    splitState === "ready" ? "success" : splitState === "over" ? "danger" : "warning";
  const cartUnitCount = cart.reduce((count, item) => count + item.quantity, 0);
  const missingSerializedUnits = cart.filter(
    (item) => item.trackingType !== "bulk" && !item.serializedUnitId,
  ).length;
  const checkoutIsReady =
    cart.length > 0 &&
    missingSerializedUnits === 0 &&
    (!token || isPreview || Boolean(tillSession)) &&
    (!token || isPreview || catalogLive);

  async function refreshPaymentAttempts(saleId: string) {
    if (!token || isPreview) return;
    setAttemptsBusy(true);
    try {
      const attempts = await listSalePayments(token, saleId);
      setPaymentAttempts(attempts);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not load payment attempts.",
      );
    } finally {
      setAttemptsBusy(false);
    }
  }


  function openManualMpesaRecovery(sale: PosSale) {
    if (cart.length) {
      setNotice(
        "Finish or clear the current cart before confirming a delayed M-Pesa sale.",
      );
      return;
    }

    setPendingSale(sale);
    setPaymentMethod("mpesa");
    setPaymentReference("");
    setMpesaPhone("");
    setMpesaReceiptCode("");
    setSplitAmounts({ cash: "", mpesa: "", card: "" });
    setSplitCardReference("");
    setPaymentStatus(
      `Enter the customer's M-Pesa receipt code to complete ${sale.invoice_number}.`,
    );
    setPaymentOpen(true);
    void refreshPaymentAttempts(sale.id);
  }

  function clearDraftOrder(message = "Cart cleared.") {
    setCart([]);
    setDiscountApproval(null);
    setApprovalOpen(false);
    setCustomerName("");
    setCustomerPhone("");
    setPendingSale(null);
    setPaymentReference("");
    setMpesaPhone("");
    setMpesaReceiptCode("");
    setPaymentAttempts([]);
    setSplitAmounts({ cash: "", mpesa: "", card: "" });
    setSplitCardReference("");
    setPaymentStatus(null);
    setPaymentOpen(false);
    setNotice(message);
  }

  function clearCurrentCart() {
    if (pendingSale) {
      setNotice("This sale already has an invoice. Use Cancel Sale instead.");
      return;
    }
    if (!cart.length) {
      setNotice("The cart is already empty.");
      return;
    }
    clearDraftOrder("Cart cleared.");
  }

  function holdCurrentOrder() {
    if (pendingSale) {
      setNotice("This sale already has an invoice. Cancel or complete it before holding another order.");
      return;
    }
    if (!cart.length) {
      setNotice("Add items before holding an order.");
      return;
    }
    const heldOrder: HeldOrder = {
      id: idempotencyKey(),
      label: customerName.trim() || `Held order ${heldOrders.length + 1}`,
      cart,
      customerName,
      customerPhone,
      createdAt: new Date().toISOString(),
      total,
    };
    setHeldOrders((current) => [heldOrder, ...current]);
    clearDraftOrder(`${heldOrder.label} moved to held orders.`);
    setActiveWorkspaceTab("held");
  }

  function resumeHeldOrder(order: HeldOrder) {
    if (pendingSale) {
      setNotice("Complete or cancel the current invoice before resuming a held order.");
      return;
    }
    if (cart.length) {
      setNotice("Clear or hold the current cart before resuming another order.");
      return;
    }
    setCart(order.cart);
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone);
    setHeldOrders((current) => current.filter((item) => item.id !== order.id));
    setReceipt(null);
    setActiveWorkspaceTab("products");
    setNotice(`${order.label} resumed.`);
  }

  function discardHeldOrder(orderId: string) {
    setHeldOrders((current) => current.filter((item) => item.id !== orderId));
    setNotice("Held order removed.");
  }

  function startNewOrder() {
    if (pendingSale) {
      setNotice("Complete or cancel the current invoice before starting a new order.");
      return;
    }
    if (cart.length) {
      setNotice("Hold or clear the current cart before starting a new order.");
      return;
    }

    setCustomerName("");
    setCustomerPhone("");
    setReceipt(null);
    setPaymentStatus(null);
    setPaymentReference("");
    setMpesaPhone("");
    setMpesaReceiptCode("");
    setSplitAmounts({ cash: "", mpesa: "", card: "" });
    setSplitCardReference("");
    setActiveCategory("All");
    setActiveWorkspaceTab("products");
    setQuery("");
    setNotice("New order is ready.");
  }

  function fillSplitAmount(method: SplitMethod) {
    const currentMethodAmount = Number(splitAmounts[method]) || 0;
    const otherMethodsTotal = splitTotal - currentMethodAmount;
    const remaining = Math.max(0, paymentOutstanding - otherMethodsTotal);
    setSplitAmounts((current) => ({
      ...current,
      [method]: remaining ? String(remaining) : "",
    }));
  }

  async function cancelUnpaidSale(sale?: PosSale | null) {
    const targetSale = sale ?? pendingSale;
    if (!token || isPreview || !targetSale) {
      setNotice("No live unpaid sale is selected to cancel.");
      return;
    }
    if (Number(targetSale.paid_amount) > 0) {
      setNotice("Partially paid sales cannot be cancelled from POS. Use refund/void approval.");
      return;
    }

    setPaymentBusy(true);
    setHistoryBusy(true);
    try {
      const cancelled = await cancelPosSale(token, targetSale.id);
      if (pendingSale?.id === cancelled.id) {
        clearDraftOrder(`${cancelled.invoice_number} cancelled.`);
      } else {
        setNotice(`${cancelled.invoice_number} cancelled.`);
      }
      await refreshRecentSales();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not cancel sale.");
    } finally {
      setPaymentBusy(false);
      setHistoryBusy(false);
    }
  }


  function payerDetails(accountReference?: string | null) {
    return {
      payer_phone: customerPhone.trim() || null,
      payer_name: customerName.trim() || null,
      payer_account_reference: accountReference?.trim() || null,
    };
  }

  function addToCart(product: PosProduct) {
    setPendingSale(null);
    setReceipt(null);

    if (product.trackingType !== "bulk") {
      const usedUnitIds = new Set(
        cart.map((item) => item.serializedUnitId).filter(Boolean),
      );
      const unit = (serializedUnitsByVariant[product.variantId] ?? []).find(
        (candidate) => !usedUnitIds.has(candidate.id),
      );

      if (!unit && token && !isPreview) {
        setNotice(`No available ${product.trackingType.toUpperCase()} unit found for ${product.name}.`);
        return;
      }

      setCart((current) => [
        ...current,
        {
          ...product,
          lineId: `${product.variantId}:${unit?.id ?? Date.now()}`,
          quantity: 1,
          serializedUnitId: unit?.id ?? null,
          discountAmount: 0,
        },
      ]);
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.variantId === product.variantId && !item.serializedUnitId,
      );
      if (existing) {
        return current.map((item) =>
          item.lineId === existing.lineId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...current,
        {
          ...product,
          lineId: product.variantId,
          quantity: 1,
          serializedUnitId: null,
          discountAmount: 0,
        },
      ];
    });
  }

  function updateQuantity(lineId: string, delta: number) {
    setPendingSale(null);
    setReceipt(null);
    setCart((current) =>
      current
        .map((item) => {
          if (item.lineId !== lineId) return item;
          if (item.trackingType !== "bulk" && delta > 0) {
            setNotice("Serialized/IMEI products are added one physical unit at a time.");
            return item;
          }
          const quantity = Math.max(0, item.quantity + delta);
          // Keep the per-unit discount the cashier chose when the quantity changes.
          const discountAmount = item.quantity
            ? Math.round(((item.discountAmount / item.quantity) * quantity) * 100) / 100
            : 0;
          return { ...item, quantity, discountAmount };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function setLineDiscount(lineId: string, discountAmount: number) {
    setPendingSale(null);
    setReceipt(null);
    setDiscountApproval(null);
    setCart((current) =>
      current.map((item) =>
        item.lineId === lineId
          ? {
              ...item,
              discountAmount: Math.min(
                Math.max(0, discountAmount),
                item.price * item.quantity,
              ),
            }
          : item,
      ),
    );
  }

  function updateSerializedUnit(lineId: string, unitId: string) {
    setPendingSale(null);
    setReceipt(null);
    const duplicate = cart.some(
      (item) => item.lineId !== lineId && item.serializedUnitId === unitId,
    );
    if (duplicate) {
      setNotice("That IMEI/serial unit is already in the cart.");
      return;
    }
    setCart((current) =>
      current.map((item) =>
        item.lineId === lineId ? { ...item, serializedUnitId: unitId || null } : item,
      ),
    );
  }

  function openPayment() {
    if (token && !isPreview && !tillSession) {
      setNotice("Open a till session before taking payment.");
      return;
    }
    if (token && !isPreview && !catalogLive) {
      setNotice("Live catalog is unavailable. Reload products before completing a real sale.");
      return;
    }
    if (!cart.length) {
      setNotice("Add at least one item before payment.");
      return;
    }
    const missingUnit = cart.find(
      (item) => item.trackingType !== "bulk" && !item.serializedUnitId,
    );
    if (missingUnit && token && !isPreview) {
      setNotice(`Select the IMEI/serial unit for ${missingUnit.name} before payment.`);
      return;
    }
    if (
      token &&
      !isPreview &&
      !pendingSale &&
      discount > 0 &&
      !discountApproval &&
      !canDiscountWithoutApproval(user)
    ) {
      setApprovalOpen(true);
      return;
    }
    setPaymentOpen(true);
  }

  function approveDiscount(approval: DiscountApprovalPayload) {
    setDiscountApproval(approval);
    setApprovalOpen(false);
    setPaymentOpen(true);
  }

  function cancelDiscountApproval() {
    setApprovalOpen(false);
    setNotice("Discount not approved. Remove the discount or ask a supervisor.");
  }

  function openPaymentWithMethod(method: PaymentMethod) {
    setPaymentMethod(method);
    setPaymentStatus(null);
    openPayment();
  }

  async function resolveCustomer(): Promise<Customer | null> {
    if (!token || isPreview) return null;
    const name = customerName.trim();
    const phone = customerPhone.trim();

    if (!name && !phone) return null;
    if (!name || !phone) {
      throw new Error("Enter both customer name and phone to print customer details on the receipt.");
    }

    const matches = await listCustomers(token, phone);
    const existing = matches.find((customer) => customer.phone === phone);
    if (existing) return existing;

    return createCustomer(token, {
      full_name: name,
      phone,
      home_branch_id: user?.branch_id ?? null,
    });
  }

  async function ensurePendingSale() {
    if (!token || !user?.branch_id || !tillSession) {
      throw new Error("A branch and open till session are required before payment.");
    }
    const customer = pendingSale ? null : await resolveCustomer();
    let sale = pendingSale;
    if (!sale) {
      try {
        sale = await createPosSale(token, {
          branch_id: user.branch_id,
          customer_id: customer?.id ?? null,
          till_session_id: tillSession.id,
          channel: "pos",
          notes: "Created from POS terminal",
          discount_approval: discount > 0 ? discountApproval : null,
          items: cart.map((item) => ({
            variant_id: item.variantId,
            serialized_unit_id: item.serializedUnitId,
            quantity: item.quantity,
            discount_amount: item.discountAmount,
          })),
        });
      } catch (error) {
        // A rejected approval must be re-entered, so never keep the password around.
        setDiscountApproval(null);
        throw error;
      }
      setDiscountApproval(null);
    }
    setPendingSale(sale);
    void refreshPaymentAttempts(sale.id);
    return sale;
  }

  async function completeSaleReceipt(saleId: string, message: string) {
    const officialReceipt = await getSaleReceipt(token!, saleId);
    setReceipt(officialReceipt);
    setReceiptViewer(officialReceipt);
    setCart([]);
    setDiscountApproval(null);
    setPendingSale(null);
    setPaymentReference("");
    setMpesaPhone("");
    setMpesaReceiptCode("");
    setPaymentAttempts([]);
    setSplitAmounts({ cash: "", mpesa: "", card: "" });
    setSplitCardReference("");
    setPaymentStatus(null);
    setPaymentOpen(false);
    setActiveWorkspaceTab("receipts");
    setNotice(message);
    void refreshRecentSales();
  }

  async function waitForMpesaCompletion(saleId: string) {
    if (!token) return false;

    for (let attempt = 0; attempt < mpesaPollSchedule.length; attempt += 1) {
      const delay = mpesaPollSchedule[attempt];
      setPaymentStatus(
        `M-Pesa prompt sent. Checking payment status ${attempt + 1}/${mpesaPollSchedule.length}...`,
      );
      await wait(delay);
      const latestSale = await getPosSale(token, saleId);
      if (latestSale.status === "completed") {
        await completeSaleReceipt(saleId, "M-Pesa payment received and receipt generated.");
        return true;
      }
      if (["cancelled", "voided", "refunded"].includes(latestSale.status)) {
        await refreshPaymentAttempts(saleId);
        return false;
      }
    }

    await refreshPaymentAttempts(saleId);
    return false;
  }

  async function manuallyCompleteMpesaPayment() {
    if (!token || !pendingSale) {
      setNotice("No pending M-Pesa sale is available to confirm.");
      return;
    }
    if (!mpesaReceiptCode.trim()) {
      setNotice("Enter the M-Pesa receipt code from the customer's SMS.");
      return;
    }

    setPaymentBusy(true);
    setPaymentStatus("Confirming M-Pesa receipt code...");
    try {
      const latestSale = await getPosSale(token, pendingSale.id);
      if (latestSale.status === "completed") {
        await completeSaleReceipt(
          pendingSale.id,
          "M-Pesa callback was received. Receipt generated.",
        );
        return;
      }

      await manuallyConfirmMpesaPayment(token, pendingSale.id, {
        provider_reference: mpesaReceiptCode.trim(),
        notes: "Cashier confirmed delayed M-Pesa callback from customer SMS.",
      });
      await completeSaleReceipt(
        pendingSale.id,
        "M-Pesa payment manually confirmed and receipt generated.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not confirm M-Pesa payment.",
      );
      setPaymentStatus(
        error instanceof Error ? error.message : "Could not confirm M-Pesa payment.",
      );
    } finally {
      setPaymentBusy(false);
    }
  }

  async function checkMpesaAttempt(payment: Payment) {
    if (!token || !payment.sale_id) return;

    setPaymentBusy(true);
    setPaymentStatus("Checking M-Pesa status with Daraja...");
    try {
      const result = await queryMpesaPaymentStatus(token, payment.id);
      setPaymentAttempts((current) => [
        result.payment,
        ...current.filter((item) => item.id !== result.payment.id),
      ]);
      const latestSale = await getPosSale(token, payment.sale_id);
      if (latestSale.status === "completed") {
        await completeSaleReceipt(
          latestSale.id,
          "M-Pesa status query confirmed payment. Receipt generated.",
        );
        return;
      }
      setPendingSale(latestSale);
      await refreshPaymentAttempts(latestSale.id);
      setPaymentStatus(result.customer_message);
      setNotice(result.customer_message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not check M-Pesa status.";
      setPaymentStatus(message);
      setNotice(message);
    } finally {
      setPaymentBusy(false);
    }
  }

  async function markAttemptOutcome(
    payment: Payment,
    status: "failed" | "cancelled",
    notes: string,
  ) {
    if (!token || !payment.sale_id) return;

    setPaymentBusy(true);
    setPaymentStatus(
      status === "cancelled"
        ? "Marking prompt as cancelled..."
        : "Marking attempt as failed...",
    );
    try {
      const updated = await markPaymentAttemptOutcome(token, payment.id, {
        status,
        notes,
      });
      setPaymentAttempts((current) => [
        updated,
        ...current.filter((item) => item.id !== updated.id),
      ]);
      const latestSale = await getPosSale(token, payment.sale_id);
      setPendingSale(latestSale);
      await refreshPaymentAttempts(latestSale.id);
      const message =
        status === "cancelled"
          ? "Payment attempt cancelled. You can retry or choose another method."
          : "Payment attempt failed. You can retry or choose another method.";
      setPaymentStatus(message);
      setNotice(message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update payment attempt.";
      setPaymentStatus(message);
      setNotice(message);
    } finally {
      setPaymentBusy(false);
    }
  }

  async function recordCardDecline() {
    if (!token || isPreview) {
      setNotice("Preview mode does not record card declines.");
      return;
    }
    if (!user?.branch_id || !tillSession) {
      setNotice("A branch and open till session are required before card payment.");
      return;
    }

    setPaymentBusy(true);
    setPaymentStatus("Recording declined card attempt...");
    try {
      const sale = await ensurePendingSale();
      const amount = Math.max(
        0,
        Number(sale.total_amount) - Number(sale.paid_amount),
      );
      if (amount <= 0) {
        setPaymentStatus("This sale has no outstanding balance.");
        return;
      }
      const failed = await recordFailedPaymentAttempt(token, sale.id, {
        method: "card",
        amount,
        status: "failed",
        provider_reference: paymentReference.trim() || null,
        ...payerDetails(paymentReference),
        idempotency_key: idempotencyKey(),
        notes: "Card declined at payment terminal.",
      });
      setPaymentAttempts((current) => [
        failed,
        ...current.filter((payment) => payment.id !== failed.id),
      ]);
      const latestSale = await getPosSale(token, sale.id);
      setPendingSale(latestSale);
      await refreshPaymentAttempts(latestSale.id);
      setPaymentStatus("Card decline recorded. Choose another method or retry card.");
      setNotice("Card decline recorded. Choose another method or retry card.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not record card decline.";
      setPaymentStatus(message);
      setNotice(message);
    } finally {
      setPaymentBusy(false);
    }
  }

  async function recordImmediatePayment(
    saleId: string,
    method: "cash" | "card",
    amount: number,
    providerReference?: string,
  ) {
    if (!token || amount <= 0) return;
    setPaymentStatus(`Recording ${method === "cash" ? "cash" : "card"} payment...`);
    await addSalePayment(token, saleId, {
      method,
      amount,
      provider_reference: method === "cash" ? null : providerReference?.trim() || null,
      ...payerDetails(method === "cash" ? null : providerReference),
      idempotency_key: idempotencyKey(),
      notes: `POS ${method} payment`,
    });
  }

  async function completePayment() {
    if (!token || isPreview) {
      setPaymentOpen(false);
      setCart([]);
      setNotice("Preview sale completed locally. Sign in to record a live POS sale.");
      return;
    }

    if (isRecoveringPendingSale) {
      setNotice("Enter the M-Pesa receipt code, then use Confirm M-Pesa Payment.");
      return;
    }

    if (!user?.branch_id || !tillSession) {
      setNotice("A branch and open till session are required before payment.");
      return;
    }

    if (paymentMethod === "split") {
      const splitCents = Math.round(splitTotal * 100);
      const totalCents = Math.round(paymentOutstanding * 100);
      if (splitCents !== totalCents) {
        setNotice(`Split payments must equal the sale total. Balance: ${money(splitBalance)}.`);
        return;
      }
      if (splitTotal <= 0) {
        setNotice("Enter at least one split payment amount.");
        return;
      }
      if (splitMpesaAmount > 0 && !mpesaPhone.trim()) {
        setNotice("Enter the customer's M-Pesa phone number for the split M-Pesa amount.");
        return;
      }
      if (splitCardAmount > 0 && !splitCardReference.trim()) {
        setNotice("Enter the card reference for the split card amount.");
        return;
      }
    }

    if (paymentMethod === "mpesa" && !mpesaPhone.trim()) {
      setNotice("Enter the customer's M-Pesa phone number before sending the prompt.");
      return;
    }

    if (paymentMethod === "card" && !paymentReference.trim()) {
      setNotice("Enter the card reference before confirming payment.");
      return;
    }

    if (
      pendingMpesaAttempt &&
      (paymentMethod === "mpesa" ||
        (paymentMethod === "split" && splitMpesaAmount > 0))
    ) {
      setNotice(
        "A M-Pesa prompt is already pending. Check its status or mark it cancelled before retrying.",
      );
      return;
    }

    setPaymentBusy(true);
    setPaymentStatus("Preparing payment...");
    try {
      const sale = await ensurePendingSale();
      const outstanding = Math.max(
        0,
        Number(sale.total_amount) - Number(sale.paid_amount),
      );
      if (outstanding <= 0) {
        setNotice("This sale has no outstanding balance.");
        setPaymentStatus("This sale has no outstanding balance.");
        return;
      }

      if (paymentMethod === "split") {
        await recordImmediatePayment(sale.id, "cash", splitCashAmount);
        await recordImmediatePayment(
          sale.id,
          "card",
          splitCardAmount,
          splitCardReference,
        );

        if (splitMpesaAmount > 0) {
          setPaymentStatus("Sending M-Pesa prompt to customer...");
          const prompt = await sendMpesaStkPush(token, sale.id, {
            phone_number: mpesaPhone.trim(),
            amount: splitMpesaAmount,
            idempotency_key: idempotencyKey(),
            notes: `Split M-Pesa payment for ${sale.invoice_number}`,
          });
          setPaymentAttempts((current) => [
            prompt.payment,
            ...current.filter((payment) => payment.id !== prompt.payment.id),
          ]);
          setPaymentStatus(prompt.customer_message);
          setNotice(prompt.customer_message);
          const completed = await waitForMpesaCompletion(sale.id);
          if (!completed) {
            setPaymentStatus(
              "M-Pesa prompt sent. Waiting for callback before receipt is generated.",
            );
            setNotice(
              "Split payment partially recorded. Waiting for M-Pesa callback before receipt is generated.",
            );
          }
          return;
        }

        await completeSaleReceipt(sale.id, "Split payment completed successfully.");
        return;
      }

      if (paymentMethod === "mpesa") {
        setPaymentStatus("Sending M-Pesa prompt to customer...");
        const prompt = await sendMpesaStkPush(token, sale.id, {
          phone_number: mpesaPhone.trim(),
          amount: outstanding,
          idempotency_key: idempotencyKey(),
          notes: `POS M-Pesa payment for ${sale.invoice_number}`,
        });
        setPaymentAttempts((current) => [
          prompt.payment,
          ...current.filter((payment) => payment.id !== prompt.payment.id),
        ]);
        setPaymentStatus(prompt.customer_message);
        setNotice(prompt.customer_message);
        const completed = await waitForMpesaCompletion(sale.id);
        if (!completed) {
          setPaymentStatus("M-Pesa prompt sent. Waiting for Safaricom callback.");
          setNotice(
            "M-Pesa prompt sent. Waiting for Safaricom callback; refresh recent sales once the customer completes payment.",
          );
        }
        return;
      }

      await addSalePayment(token, sale.id, {
        method: paymentMethod,
        amount: outstanding,
        provider_reference: paymentMethod === "cash" ? null : paymentReference.trim(),
        ...payerDetails(paymentMethod === "cash" ? null : paymentReference),
        idempotency_key: idempotencyKey(),
        notes: `POS ${paymentMethod} payment`,
      });

      await completeSaleReceipt(sale.id, "Sale completed successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not complete sale.");
      setPaymentStatus(error instanceof Error ? error.message : "Could not complete sale.");
    } finally {
      setPaymentBusy(false);
    }
  }

  return {
    cart,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    paymentMethod,
    setPaymentMethod,
    paymentReference,
    setPaymentReference,
    mpesaPhone,
    setMpesaPhone,
    mpesaReceiptCode,
    setMpesaReceiptCode,
    splitAmounts,
    setSplitAmounts,
    splitCardReference,
    setSplitCardReference,
    paymentOpen,
    setPaymentOpen,
    paymentBusy,
    paymentStatus,
    attemptsBusy,
    receipt,
    receiptViewer,
    setReceiptViewer,
    heldOrders,
    pendingSale,
    setPendingSale,
    subtotal,
    discount,
    total,
    paymentSubtotal,
    paymentDiscount,
    paymentTotal,
    paymentOutstanding,
    currentPaymentAttempts,
    isRecoveringPendingSale,
    splitMpesaAmount,
    splitCardAmount,
    splitTotal,
    splitBalance,
    splitTone,
    cartUnitCount,
    missingSerializedUnits,
    checkoutIsReady,
    refreshPaymentAttempts,
    openManualMpesaRecovery,
    clearCurrentCart,
    holdCurrentOrder,
    resumeHeldOrder,
    discardHeldOrder,
    startNewOrder,
    fillSplitAmount,
    cancelUnpaidSale,
    addToCart,
    updateQuantity,
    updateSerializedUnit,
    setLineDiscount,
    approvalOpen,
    approveDiscount,
    cancelDiscountApproval,
    openPayment,
    openPaymentWithMethod,
    manuallyCompleteMpesaPayment,
    checkMpesaAttempt,
    markAttemptOutcome,
    recordCardDecline,
    completePayment,
  };
}

export type CheckoutController = ReturnType<typeof usePosCheckout>;
