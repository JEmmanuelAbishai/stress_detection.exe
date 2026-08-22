import type { KeyEvent } from "@shared/types";

type KeyEventHandler = (event: KeyEvent) => void;

/**
 * Attaches low-level keydown/keyup listeners to the page and normalizes them
 * into KeyEvent objects. Deliberately does NOT record which character was
 * typed by default (see privacy.md) — only timing + whether it was a
 * backspace, which is all the feature extractor needs.
 */
export class KeystrokeListener {
  private handlers: KeyEventHandler[] = [];
  private captureKeyIdentity: boolean;
  private onKeyDown = (e: KeyboardEvent) => this.handleEvent(e, "keydown");
  private onKeyUp = (e: KeyboardEvent) => this.handleEvent(e, "keyup");

  constructor(options: { captureKeyIdentity: boolean }) {
    this.captureKeyIdentity = options.captureKeyIdentity;
  }

  start(): void {
    document.addEventListener("keydown", this.onKeyDown, { capture: true, passive: true });
    document.addEventListener("keyup", this.onKeyUp, { capture: true, passive: true });
  }

  stop(): void {
    document.removeEventListener("keydown", this.onKeyDown, { capture: true });
    document.removeEventListener("keyup", this.onKeyUp, { capture: true });
    this.handlers = [];
  }

  onEvent(handler: KeyEventHandler): void {
    this.handlers.push(handler);
  }

  private handleEvent(e: KeyboardEvent, type: "keydown" | "keyup"): void {
    const isBackspace = e.key === "Backspace" || e.key === "Delete";
    const event: KeyEvent = {
      key: this.captureKeyIdentity ? e.key : isBackspace ? "Backspace" : "k",
      code: e.code,
      type,
      timestamp: performance.now(),
      isBackspace
    };
    for (const handler of this.handlers) handler(event);
  }
}