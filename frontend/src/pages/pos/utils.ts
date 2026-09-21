import type {
  CatalogProduct,
  PosProduct,
  SerializedUnit,
  StatusTone,
  TillSession,
} from "../../api/types";
import type { SplitBalanceState } from "./types";

export function money(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

export function idempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export const mpesaPollSchedule = [
  1000, 1500, 1500, 2000, 2500, 3000, 4000, 5000, 7000, 10000, 10000,
];

export function unitLabel(unit?: SerializedUnit) {
  if (!unit) return "No unit selected";
  return unit.imei || unit.serial_number || unit.id;
}

export function saleStatusTone(status: string): StatusTone {
  if (status === "completed" || status === "paid") return "success";
  if (status === "pending_payment" || status === "draft") return "warning";
  if (status === "voided" || status === "refunded" || status === "cancelled") {
    return "danger";
  }
  return "neutral";
}

export function paymentStatusTone(status: string): StatusTone {
  if (status === "completed") return "success";
  if (status === "pending") return "warning";
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "refunded") return "neutral";
  return "neutral";
}

export function tillVariance(session: TillSession | null) {
  if (!session?.expected_cash || !session.closing_cash) return null;
  return Number(session.closing_cash) - Number(session.expected_cash);
}

export function splitBalanceState(balance: number): SplitBalanceState {
  if (Math.round(balance * 100) === 0) return "ready";
  return balance < 0 ? "over" : "remaining";
}

export function splitBalanceLabel(balance: number) {
  const state = splitBalanceState(balance);
  if (state === "ready") return "Balanced";
  if (state === "over") return `Over by ${money(Math.abs(balance))}`;
  return `${money(balance)} remaining`;
}

export function productsFromApi(products: CatalogProduct[]): PosProduct[] {
  const accents = ["#4e5381", "#0388d2", "#00897b", "#faaa33", "#aa47bd"];

  return products.flatMap((product, index) =>
    product.variants.map((variant) => ({
      id: `${product.id}:${variant.id}`,
      variantId: variant.id,
      name: product.name.replace(/^(Demo|Sample)\s+/i, ""),
      variantName: variant.name,
      sku: variant.sku,
      category: product.warranty_months ? "Devices" : "Accessories",
      price: Number(variant.selling_price),
      trackingType: variant.tracking_type,
      stockHint:
        variant.tracking_type === "bulk"
          ? "Bulk stock"
          : variant.tracking_type.toUpperCase(),
      accent: accents[index % accents.length],
    })),
  );
}
