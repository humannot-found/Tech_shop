import { useEffect, useMemo, useState } from "react";

import {
  ApiError,
  currentTillSession,
  getSaleReceipt,
  listCatalogProducts,
  listPosSales,
  listSerializedUnits,
  listTills,
} from "../api/client";
import type {
  PosProduct,
  PosSale,
  SerializedUnit,
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
  PosPageProps,
  PosWorkspaceTab,
  SalesHistoryStatus,
} from "./pos/types";
import { usePosCheckout } from "./pos/usePosCheckout";
import { useRepairDesk } from "./pos/useRepairDesk";
import { useTill } from "./pos/useTill";
import { productsFromApi } from "./pos/utils";

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
  const [notice, setNotice] = useState<string | null>(null);

  const [recentSales, setRecentSales] = useState<PosSale[]>([]);
  const [historyStatus, setHistoryStatus] = useState<SalesHistoryStatus>("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);

  const [serializedUnitsByVariant, setSerializedUnitsByVariant] = useState<
    Record<string, SerializedUnit[]>
  >({});

  const till = useTill({
    token,
    isPreview,
    user,
    setNotice,
    getCloseBlocker: () => {
      if (checkout.cart.length) {
        return "Clear or complete the current cart before closing the till.";
      }
      if (checkout.heldOrders.length) {
        return "Resume or discard held orders before closing the till.";
      }
      return null;
    },
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

  const checkout = usePosCheckout({
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
  });
  const {
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
    openPayment,
    openPaymentWithMethod,
    manuallyCompleteMpesaPayment,
    checkMpesaAttempt,
    markAttemptOutcome,
    recordCardDecline,
    completePayment,
  } = checkout;

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

  function printReceipt() {
    window.print();
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
