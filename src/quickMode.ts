export type QuickMode = 'add' | 'open';

const QUICK_MODE_KEY = 'quickMode';

function isQuickMode(value: unknown): value is QuickMode {
  return value === 'add' || value === 'open';
}

async function readQuickModeFrom(area?: chrome.storage.StorageArea): Promise<QuickMode | null> {
  if (!area) {
    return null;
  }

  const result = await area.get([QUICK_MODE_KEY]);
  const mode = result[QUICK_MODE_KEY];

  return isQuickMode(mode) ? mode : null;
}

function writeQuickModeTo(area: chrome.storage.StorageArea | undefined, mode: QuickMode): Promise<void> {
  if (!area) {
    return Promise.resolve();
  }

  return area.set({ [QUICK_MODE_KEY]: mode });
}

export async function readQuickMode(): Promise<QuickMode> {
  const sessionMode = await readQuickModeFrom(chrome.storage.session);
  if (sessionMode) {
    return sessionMode;
  }

  const localMode = await readQuickModeFrom(chrome.storage.local);
  if (localMode) {
    void writeQuickModeTo(chrome.storage.session, localMode);
    return localMode;
  }

  return 'add';
}

export async function writeQuickMode(mode: QuickMode): Promise<void> {
  await Promise.all([
    writeQuickModeTo(chrome.storage.session, mode),
    writeQuickModeTo(chrome.storage.local, mode),
  ]);
}

export async function primeQuickMode(mode: QuickMode): Promise<void> {
  await writeQuickModeTo(chrome.storage.session, mode);
  void writeQuickModeTo(chrome.storage.local, mode);
}