import { getServerBaseUrl } from '../api/client';

type ConsoleErrorArg = unknown;

let installed = false;

function serializeArg(arg: ConsoleErrorArg): unknown {
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: arg.message,
      stack: arg.stack,
    };
  }

  if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean' || arg == null) {
    return arg;
  }

  try {
    return JSON.parse(JSON.stringify(arg));
  } catch {
    return String(arg);
  }
}

export function installConsoleErrorReporter(): void {
  if (installed) {
    return;
  }

  installed = true;
  const originalConsoleError = console.error.bind(console);

  console.error = (...args: ConsoleErrorArg[]) => {
    originalConsoleError(...args);

    void fetch(`${getServerBaseUrl()}/show-errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'frontend',
        timestamp: new Date().toISOString(),
        message: args.map((arg) => (typeof arg === 'string' ? arg : arg instanceof Error ? arg.message : String(arg))).join(' '),
        args: args.map(serializeArg),
      }),
    }).catch(() => {
      // Avoid recursive logging if the error reporting endpoint is unavailable.
    });
  };
}
