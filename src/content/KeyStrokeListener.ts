import type { KeyEvent } from "@shared/types";

type KeyEventHandler = (event: KeyEvent) => void;

interface KeystrokeListenerOptions {
  captureKeyIdentity: boolean;
}

/**
 * Captures keyboard events and distributes sanitized KeyEvents
 * to registered handlers.
 *
 * The actual typed character is never stored. KeyboardEvent.code
 * is used only to pair keydown and keyup events for timing features.
 */
export class KeystrokeListener {
  private handlers: KeyEventHandler[] = [];

  private isListening = false;

  constructor(_options: KeystrokeListenerOptions) {
    // captureKeyIdentity is currently unused because KeyEvent
    // does not store the typed character/key identity.
  }

  /**
   * Registers a handler to receive keystroke events.
   */
  onEvent(handler: KeyEventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Starts listening for keyboard events.
   */
  start(): void {
    if (this.isListening) return;

    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("keyup", this.handleKeyUp, true);

    this.isListening = true;
  }

  /**
   * Stops listening for keyboard events.
   */
  stop(): void {
    if (!this.isListening) return;

    document.removeEventListener("keydown", this.handleKeyDown, true);
    document.removeEventListener("keyup", this.handleKeyUp, true);

    this.isListening = false;
  }

  /**
   * Dispatches a keystroke event to all registered handlers.
   */
  private dispatch(event: KeyEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    this.dispatch({
      type: "keydown",
      code: event.code,
      timestamp: performance.now(),
      isBackspace: event.code === "Backspace",
    });
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.dispatch({
      type: "keyup",
      code: event.code,
      timestamp: performance.now(),
      isBackspace: event.code === "Backspace",
    });
  };

  /**
   * Clears all registered handlers.
   */
  clear(): void {
    this.handlers = [];
  }
}