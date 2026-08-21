import type { KeyEvent } from "@shared/types";

type KeyEventHandler = (event: KeyEvent) => void;

/**
 * Fan-out listener for raw keystroke events. Content-script components
 * register handlers here and receive typed KeyEvents (timing + backspace
 * only — never the typed character itself).
 */
export class KeystrokeListener {
  private handlers: KeyEventHandler[] = [];

  /** Registers a handler to receive keystroke events. */
  on(handler: KeyEventHandler): void {
    this.handlers.push(handler);
  }

  /** Removes a previously registered handler. */
  off(handler: KeyEventHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers.splice(index, 1);
    }
  }

  /** Dispatches a keystroke event to all registered handlers. */
  dispatch(event: KeyEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  /** Clears all registered handlers. */
  clear(): void {
    this.handlers = [];
  }
}
