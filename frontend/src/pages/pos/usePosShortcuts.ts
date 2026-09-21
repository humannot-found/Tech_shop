import { useEffect, useRef } from "react";

export type PosShortcutHandlers = {
  focusSearch: () => void;
  openPayment: () => void;
  holdOrder: () => void;
  newOrder: () => void;
  /** Returns true when it closed something, so Escape is only swallowed then. */
  closeTopDialog: () => boolean;
};

export const posShortcutHints = [
  { key: "F2", label: "Search / scan" },
  { key: "F4", label: "Payment" },
  { key: "F8", label: "Hold order" },
  { key: "F9", label: "New order" },
  { key: "Esc", label: "Close dialog" },
];

/**
 * Cashier keyboard shortcuts. F-keys work while typing in a field, so a cashier
 * can scan an item and go straight to payment without touching the mouse.
 */
export function usePosShortcuts(handlers: PosShortcutHandlers) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;

      const actions: Record<string, () => void> = {
        F2: () => latest.current.focusSearch(),
        F4: () => latest.current.openPayment(),
        F8: () => latest.current.holdOrder(),
        F9: () => latest.current.newOrder(),
      };

      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
        return;
      }

      if (event.key === "Escape" && latest.current.closeTopDialog()) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
