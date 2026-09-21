import { useEffect, useMemo, useState } from "react";

import {
  ApiError,
  addSalePayment,
  cancelPosSale,
  createCustomer,
  createPosSale,
  currentTillSession,
  getPosSale,
  getSaleReceipt,
  listCatalogProducts,
  listCustomers,
  listSalePayments,
  listPosSales,
  listSerializedUnits,
  listTills,
  manuallyConfirmMpesaPayment,
  markPaymentAttemptOutcome,
  queryMpesaPaymentStatus,
  recordFailedPaymentAttempt,
  sendMpesaStkPush,
} from "../api/client";
import type {
  Customer,
  Payment,
  PosProduct,
  PosSale,
  Receipt,
  SerializedUnit,
  StatusTone,
} from "../api/types";
import { StatusPill } from "../components/StatusPill";
import { ToastNotice } from "../components/ToastNotice";
import { mockProducts } from "../data/mockProducts";
import { useAuth } from "../state/auth";
import { HeldOrdersTab } from "./pos/HeldOrdersTab";
import { OrderPanel } from "./pos/OrderPanel";
import { PaymentModal } from "./pos/PaymentModal";
import { ProductsTab } from "./pos/ProductsTab";
import { ReceiptModal } from "./pos/ReceiptModal";
import { ReceiptsTab } from "./pos/ReceiptsTab";
import { RepairInvoiceModal } from "./pos/RepairInvoiceModal";
import { RepairPickupsTab } from "./pos/RepairPickupsTab";
import { TillPanels } from "./pos/TillPanels";
import type {
  CartItem,
  HeldOrder,
  PaymentMethod,
  PosPageProps,
  PosWorkspaceTab,
  SalesHistoryStatus,
  SplitMethod,
} from "./pos/types";
import { useRepairDesk } from "./pos/useRepairDesk";
import { useTill } from "./pos/useTill";
import {
  idempotencyKey,
  money,
  mpesaPollSchedule,
  productsFromApi,
  splitBalanceState,
  wait,
} from "./pos/utils";

export function PosPage({
  focusRepairTicketId = null,
  onRepairFocusHandled,
}: PosPageProps) {
  const { token, isPreview, user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<PosWorkspaceTab>("products");
  const [products, setProducts] = useState<PosProduct[]>(mockProducts);
  const [catalogLive, setCatalogLive] = useState(false);
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
  const [notice, setNotice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptViewer, setReceiptViewer] = useState<Receipt | null>(null);

  const [recentSales, setRecentSales] = useState<PosSale[]>([]);
  const [historyStatus, setHistoryStatus] = useState<SalesHistoryStatus>("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [pendingSale, setPendingSale] = useState<PosSale | null>(null);

  const [serializedUnitsByVariant, setSerializedUnitsByVariant] = useState<
    Record<string, SerializedUnit[]>
  >({});

  const till = useTill({
    token,
    isPreview,
    user,
    setNotice,
    cartLineCount: cart.length,
    heldOrderCount: heldOrders.length,
    onClosed: () => void refreshRecentSales(),
  });
  const { tillSession, setTillSession, setTills, setSelectedTillId } = till;
  const repairDesk = useRepairDesk({
    token,
    isPreview,
    user,
    tillSession,
    setNotice,
    setActiveWorkspaceTab,
    focusRepairTicketId,
    onRepairFocusHandled,
  });
  const { repairReceiptViewer, setRepairReceiptViewer } = repairDesk;


  useEffect(() => {
    if (!token || isPreview) {
      return;
    }

    let active = true;
    Promise.allSettled([
      listCatalogProducts(token, query || "demo"),
      currentTillSession(token),
      user?.branch_id ? listTills(token, user.branch_id) : Promise.resolve([]),
      user?.branch_id ? listSerializedUnits(token, user.branch_id) : Promise.resolve({ items: [] }),
    ]).then(([catalogResult, tillResult, tillsResult, unitsResult]) => {
      if (!active) return;

      if (catalogResult.status === "fulfilled") {
        const apiProducts = productsFromApi(catalogResult.value.items);
        if (apiProducts.length) {
          setProducts(apiProducts);
        }
        setCatalogLive(true);
      } else {
        setCatalogLive(false);
        setNotice("Catalog is unavailable. Local preview products remain visible.");
      }

      if (tillResult.status === "fulfilled") {
        setTillSession(tillResult.value);
        setSelectedTillId(tillResult.value.till_id);
      } else if (tillResult.reason instanceof ApiError) {
        setTillSession(null);
        setNotice("No open till session found. Select a till and enter opening float to start selling.");
      }

      if (tillsResult.status === "fulfilled") {
        setTills(tillsResult.value);
        setSelectedTillId((current) => current || tillsResult.value[0]?.id || "");
        if (tillResult.status !== "fulfilled" && !tillsResult.value.length) {
          setNotice("No active tills are configured for this branch. Ask a manager/admin to create one.");
        }
      } else if (tillResult.status !== "fulfilled") {
        const message =
          tillsResult.reason instanceof ApiError && tillsResult.reason.status === 403
            ? "This account cannot list tills for the selected branch."
            : "Could not load tills for this branch. Sign out and back in if this persists.";
        setNotice(message);
      }

      if (unitsResult.status === "fulfilled") {
        const grouped = unitsResult.value.items.reduce<Record<string, SerializedUnit[]>>(
          (result, unit) => {
            result[unit.variant_id] = [...(result[unit.variant_id] ?? []), unit];
            return result;
          },
          {},
        );
        setSerializedUnitsByVariant(grouped);
      }
    });

    return () => {
      active = false;
    };
  }, [isPreview, query, token, user?.branch_id]);

  useEffect(() => {
    void refreshRecentSales();
  }, [historyStatus, isPreview, token, user?.branch_id]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((product) => product.category)))],
    [products],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatches =
        activeCategory === "All" || product.category === activeCategory;
      const textMatches =
        !needle ||
        [product.name, product.variantName, product.sku, product.category]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return categoryMatches && textMatches;
    });
  }, [activeCategory, products, query]);

  const filteredRecentSales = useMemo(() => {
    const needle = historySearch.trim().toLowerCase();
    return recentSales.filter((sale) => {
      if (historyStatus !== "all" && sale.status !== historyStatus) return false;
      if (!needle) return true;
      return [
        sale.invoice_number,
        sale.status,
        sale.items.map((item) => item.description).join(" "),
        sale.total_amount,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [historySearch, historyStatus, recentSales]);

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const discount = 0;
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

  async function refreshRecentSales() {
    if (!token || isPreview || !user?.branch_id) return;
    setHistoryBusy(true);
    try {
      const page = await listPosSales(token, user.branch_id, {
        pageSize: 30,
        status: historyStatus === "all" ? undefined : historyStatus,
      });
      setRecentSales(page.items);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load recent sales.");
    } finally {
      setHistoryBusy(false);
    }
  }


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

  async function openReceiptViewer(saleId: string) {
    if (!token || isPreview) {
      if (receipt) setReceiptViewer(receipt);
      return;
    }
    setHistoryBusy(true);
    try {
      const officialReceipt = await getSaleReceipt(token, saleId);
      setReceiptViewer(officialReceipt);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open receipt.");
    } finally {
      setHistoryBusy(false);
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

  function explainOrderControl(control: "Qty" | "Price" | "Disc %" | "Disc KES") {
    if (control === "Qty") {
      setNotice(
        "Use the + and - buttons on each cart line. Serialized/IMEI items are added one physical unit at a time.",
      );
      return;
    }

    setNotice(
      `${control} controls will be enabled once manager price and discount approval rules are switched on.`,
    );
  }

  function showProductInformationHint() {
    setNotice(
      `${filtered.length} product(s) visible. Click a product to add it, or open Catalog for full specs, images, and pricing setup.`,
    );
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

  function printReceipt() {
    window.print();
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
        { ...product, lineId: product.variantId, quantity: 1, serializedUnitId: null },
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
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        })
        .filter((item) => item.quantity > 0),
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
    setPaymentOpen(true);
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
    const sale =
      pendingSale ??
      (await createPosSale(token, {
        branch_id: user.branch_id,
        customer_id: customer?.id ?? null,
        till_session_id: tillSession.id,
        channel: "pos",
        notes: "Created from POS terminal",
        items: cart.map((item) => ({
          variant_id: item.variantId,
          serialized_unit_id: item.serializedUnitId,
          quantity: item.quantity,
          discount_amount: 0,
        })),
      }));
    setPendingSale(sale);
    void refreshPaymentAttempts(sale.id);
    return sale;
  }

  async function completeSaleReceipt(saleId: string, message: string) {
    const officialReceipt = await getSaleReceipt(token!, saleId);
    setReceipt(officialReceipt);
    setReceiptViewer(officialReceipt);
    setCart([]);
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

  return (
    <section className="pos-terminal">
      <OrderPanel
        cart={cart}
        heldOrderCount={heldOrders.length}
        onShowHeldOrders={() => setActiveWorkspaceTab("held")}
        onNewOrder={startNewOrder}
        customerName={customerName}
        customerPhone={customerPhone}
        onCustomerNameChange={(value) => {
          setCustomerName(value);
          setPendingSale(null);
        }}
        onCustomerPhoneChange={(value) => {
          setCustomerPhone(value);
          setPendingSale(null);
        }}
        checkoutIsReady={checkoutIsReady}
        missingSerializedUnits={missingSerializedUnits}
        hasTillOrPreview={Boolean(tillSession || isPreview)}
        cartUnitCount={cartUnitCount}
        subtotal={subtotal}
        discount={discount}
        total={total}
        serializedUnitsByVariant={serializedUnitsByVariant}
        updateSerializedUnit={updateSerializedUnit}
        updateQuantity={updateQuantity}
        explainOrderControl={explainOrderControl}
        openPaymentWithMethod={openPaymentWithMethod}
        openPayment={openPayment}
        clearCurrentCart={clearCurrentCart}
        holdCurrentOrder={holdCurrentOrder}
      />

      <section className="pos-products-panel">
        <header className="pos-workspace-header">
          <nav className="pos-workspace-tabs" aria-label="POS workspace">
            {[
              ["products", "Products"],
              ["receipts", "Receipts"],
              ["repair_pickups", "Repair Pickups"],
              ["held", "Held Orders"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                className={activeWorkspaceTab === tab ? "is-active" : ""}
                onClick={() => setActiveWorkspaceTab(tab as PosWorkspaceTab)}
              >
                {label}
                {tab === "receipts" && recentSales.length > 0 && (
                  <span>{recentSales.length}</span>
                )}
                {tab === "repair_pickups" && repairDesk.repairPickups.length > 0 && (
                  <span>{repairDesk.repairPickups.length}</span>
                )}
                {tab === "held" && heldOrders.length > 0 && (
                  <span>{heldOrders.length}</span>
                )}
              </button>
            ))}
          </nav>

          <StatusPill tone={tillSession ? "success" : "warning"}>
            {tillSession ? "Till open" : "Open till required"}
          </StatusPill>
        </header>

        <ToastNotice message={notice} onClose={() => setNotice(null)} />

        {activeWorkspaceTab === "products" && (
          <ProductsTab
            query={query}
            setQuery={setQuery}
            filtered={filtered}
            catalogLive={catalogLive}
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            showProductInformationHint={showProductInformationHint}
            addToCart={addToCart}
          >
            <TillPanels till={till} />
          </ProductsTab>
        )}

        {activeWorkspaceTab === "receipts" && (
          <ReceiptsTab
            receipt={receipt}
            onOpenReceipt={setReceiptViewer}
            filteredRecentSales={filteredRecentSales}
            historyBusy={historyBusy}
            historyStatus={historyStatus}
            setHistoryStatus={setHistoryStatus}
            historySearch={historySearch}
            setHistorySearch={setHistorySearch}
            paymentBusy={paymentBusy}
            refreshRecentSales={refreshRecentSales}
            openManualMpesaRecovery={openManualMpesaRecovery}
            cancelUnpaidSale={cancelUnpaidSale}
            openReceiptViewer={openReceiptViewer}
          />
        )}

        {activeWorkspaceTab === "repair_pickups" && (
          <RepairPickupsTab desk={repairDesk} tillSession={tillSession} />
        )}

        {activeWorkspaceTab === "held" && (
          <HeldOrdersTab
            heldOrders={heldOrders}
            onResume={resumeHeldOrder}
            onDiscard={discardHeldOrder}
          />
        )}
      </section>

      {receiptViewer && (
        <ReceiptModal
          receipt={receiptViewer}
          onPrint={printReceipt}
          onClose={() => setReceiptViewer(null)}
        />
      )}

      {repairReceiptViewer && (
        <RepairInvoiceModal
          invoice={repairReceiptViewer}
          cashierName={user?.full_name}
          onPrint={printReceipt}
          onClose={() => setRepairReceiptViewer(null)}
        />
      )}

      {paymentOpen && (
        <PaymentModal
          cashierName={user?.full_name}
          paymentTotal={paymentTotal}
          paymentSubtotal={paymentSubtotal}
          paymentDiscount={paymentDiscount}
          paymentOutstanding={paymentOutstanding}
          onClose={() => setPaymentOpen(false)}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentStatus={paymentStatus}
          pendingSale={pendingSale}
          attemptsBusy={attemptsBusy}
          currentPaymentAttempts={currentPaymentAttempts}
          paymentBusy={paymentBusy}
          refreshPaymentAttempts={refreshPaymentAttempts}
          checkMpesaAttempt={checkMpesaAttempt}
          markAttemptOutcome={markAttemptOutcome}
          cancelUnpaidSale={cancelUnpaidSale}
          splitTone={splitTone}
          splitBalance={splitBalance}
          splitTotal={splitTotal}
          fillSplitAmount={fillSplitAmount}
          splitAmounts={splitAmounts}
          setSplitAmounts={setSplitAmounts}
          splitMpesaAmount={splitMpesaAmount}
          splitCardAmount={splitCardAmount}
          mpesaPhone={mpesaPhone}
          setMpesaPhone={setMpesaPhone}
          splitCardReference={splitCardReference}
          setSplitCardReference={setSplitCardReference}
          paymentReference={paymentReference}
          setPaymentReference={setPaymentReference}
          recordCardDecline={recordCardDecline}
          mpesaReceiptCode={mpesaReceiptCode}
          setMpesaReceiptCode={setMpesaReceiptCode}
          manuallyCompleteMpesaPayment={manuallyCompleteMpesaPayment}
          isRecoveringPendingSale={isRecoveringPendingSale}
          completePayment={completePayment}
        />
      )}
    </section>
  );
}
