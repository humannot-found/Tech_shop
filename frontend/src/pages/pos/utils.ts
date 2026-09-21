import type {
  CatalogProduct,
  CurrentUser,
  PosProduct,
  SerializedUnit,
  StatusTone,
  TillSession,
} from "../../api/types";
import type { DiscountMode, SplitBalanceState } from "./types";

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

export function canDiscountWithoutApproval(user: CurrentUser | null) {
  if (!user) return false;
  return (
    ["admin", "owner"].includes(user.role_code.toLowerCase()) ||
    user.permissions.includes("*") ||
    user.permissions.includes("sales.discount")
  );
}

/** Turns what the cashier typed into a line discount in KES, or an error. */
export function lineDiscountFromInput(
  mode: DiscountMode,
  rawValue: string,
  lineGross: number,
): { amount: number } | { error: string } {
  const value = Number(rawValue);
  if (rawValue.trim() === "" || !Number.isFinite(value) || value < 0) {
    return { error: "Enter a number of zero or more." };
  }
  let amount: number;
  if (mode === "percent") {
    if (value > 100) return { error: "A percentage cannot be more than 100." };
    amount = Math.round((lineGross * value) / 100);
  } else if (mode === "amount") {
    amount = value;
  } else {
    if (value > lineGross) {
      return { error: "The new price cannot be higher than the list price." };
    }
    amount = lineGross - value;
  }
  if (amount > lineGross) {
    return { error: "The discount cannot be more than the line total." };
  }
  return { amount: Math.round(amount * 100) / 100 };
}
