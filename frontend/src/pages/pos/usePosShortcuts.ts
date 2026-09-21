import { useEffect, useRef } from "react";

export type PosShortcutHandlers = {
  focusSearch: () => void;
  openPayment: () => void;
  holdOrder: () => void;
  newOrder: () => void;
  /** Returns true when it closed something, so Escape is only swallowed then. */
  closeTopDialog: () => boolean;
};

/**
 * Alt + letter, not the F-keys: laptop keyboards give the F-row other jobs
 * (volume, brightness) unless Fn is held. Keys are matched by physical key
 * position, so they work on any keyboard layout.
 */
export const posShortcutHints = [
  { key: "Alt+S", label: "Search / scan" },
  { key: "Alt+P", label: "Payment" },
  { key: "Alt+H", label: "Hold order" },
  { key: "Alt+N", label: "New order" },
  { key: "Esc", label: "Close dialog" },
];

/**
 * Cashier keyboard shortcuts. They work while typing in a field, so a cashier
 * can scan an item and go straight to payment without touching the mouse.
 */
export function usePosShortcuts(handlers: PosShortcutHandlers) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;

      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const actions: Record<string, () => void> = {
          KeyS: () => latest.current.focusSearch(),
          KeyP: () => latest.current.openPayment(),
          KeyH: () => latest.current.holdOrder(),
          KeyN: () => latest.current.newOrder(),
        };
        const action = actions[event.code];
        if (action) {
          event.preventDefault();
          action();
        }
        return;
      }

      if (
        event.key === "Escape" &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        latest.current.closeTopDialog()
      ) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
