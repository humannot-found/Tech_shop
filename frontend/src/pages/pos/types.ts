import type {
  PosProduct,
  RepairCollection,
  RepairInvoice,
} from "../../api/types";

export type CartItem = PosProduct & {
  lineId: string;
  quantity: number;
  serializedUnitId: string | null;
  /** Discount for the whole line, in KES. */
  discountAmount: number;
};

export type DiscountMode = "percent" | "amount" | "price";

export type PaymentMethod = "cash" | "mpesa" | "card" | "split";
export type SplitMethod = "cash" | "mpesa" | "card";
export type RepairPaymentMethod = "cash" | "mpesa" | "card";
export type PosWorkspaceTab = "products" | "receipts" | "repair_pickups" | "held";
export type SalesHistoryStatus = "all" | "completed" | "pending_payment" | "cancelled";
export type SplitBalanceState = "ready" | "remaining" | "over";

export type PosPageProps = {
  focusRepairTicketId?: string | null;
  onRepairFocusHandled?: () => void;
};

export type CollectedRepairSnapshot = RepairCollection & {
  invoice: RepairInvoice;
};

export type HeldOrder = {
  id: string;
  label: string;
  cart: CartItem[];
  customerName: string;
  customerPhone: string;
  createdAt: string;
  total: number;
};
