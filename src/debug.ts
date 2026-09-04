const MAX_ENTRIES = 200;
const PREFIX = "[swo]";

interface Entry {
  time: string;
  event: string;
  data?: unknown;
}

const entries: Entry[] = [];

export function log(event: string, data?: unknown): void {
  entries.push({ time: new Date().toISOString(), event, data });
  if (entries.length > MAX_ENTRIES) entries.shift();
  console.debug(PREFIX, event, data ?? "");
}

export function logError(event: string, error: unknown): void {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  log(event, {
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
  });
}

export function debugReport(extra: Record<string, unknown>): string {
  return JSON.stringify(
    {
      version: extensionVersion(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      url: location.href,
      devicePixelRatio: devicePixelRatio,
      ...extra,
      entries,
    },
    null,
    2,
  );
}

function extensionVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "injected";
  }
}
