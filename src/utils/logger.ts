/**
 * Keeps console noise identifiable 
 */

const isDev = import.meta.env?.DEV ?? false;

export function createLogger(namespace: string) {
  const prefix = `[stress-detector:${namespace}]`;
  return {
    debug: (...args: unknown[]) => {
      if (isDev) console.debug(prefix, ...args);
    },
    info: (...args: unknown[]) => console.info(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args)
  };
}

export type Logger = ReturnType<typeof createLogger>;
