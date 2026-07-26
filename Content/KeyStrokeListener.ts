// Function type for components that want to receive keystroke events.
type KeyEventHandler = (event: KeyEvent) => void;

// Represents a keystroke event.
interface KeyEvent {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

class KeystrokeListener {
  // Stores all registered event handlers.
  private handlers: KeyEventHandler[] = [];

  // Registers a handler to receive keystroke events.
  on(handler: KeyEventHandler): void {
    this.handlers.push(handler);
  }

  // Removes a previously registered handler.
  off(handler: KeyEventHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers.splice(index, 1);
    }
  }

  // Dispatches a keystroke event to all registered handlers.
  dispatch(event: KeyEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  // Clears all registered handlers.
  clear(): void {
    this.handlers = [];
  }
}

export = KeystrokeListener;
