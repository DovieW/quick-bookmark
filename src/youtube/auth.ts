const YOUTUBE_CLIENT_ID = import.meta.env.VITE_YOUTUBE_CLIENT_ID?.trim() ?? "";
const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";
const AUTH_PLACEHOLDER_PREFIX = "YOUR_";
const AUTH_TOKEN_KEY = "youtubeAccessToken";

function isYouTubeClientIdConfigured(): boolean {
  return (
    YOUTUBE_CLIENT_ID.length > 0 &&
    !YOUTUBE_CLIENT_ID.startsWith(AUTH_PLACEHOLDER_PREFIX)
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createOAuthError(message: string): Error {
  return new Error(`YouTube OAuth: ${message}`);
}

function extractAccessToken(
  result: string | chrome.identity.GetAuthTokenResult | undefined,
): string | null {
  if (typeof result === "string") {
    return result;
  }

  if (
    result &&
    typeof result === "object" &&
    "token" in result &&
    typeof result.token === "string" &&
    result.token.length > 0
  ) {
    return result.token;
  }

  return null;
}

async function readStoredAccessToken(): Promise<string | null> {
  const result = await chrome.storage.local.get([AUTH_TOKEN_KEY]);
  return typeof result[AUTH_TOKEN_KEY] === "string" && result[AUTH_TOKEN_KEY].length > 0
    ? result[AUTH_TOKEN_KEY]
    : null;
}

async function writeStoredAccessToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [AUTH_TOKEN_KEY]: token });
}

async function requestChromeIdentityToken(interactive: boolean): Promise<string> {
  if (!isYouTubeClientIdConfigured()) {
    throw createOAuthError(
      "missing VITE_YOUTUBE_CLIENT_ID. Add your Chrome Extension OAuth client ID to .env.",
    );
  }

  try {
    const result = await chrome.identity.getAuthToken({
      interactive,
      scopes: [YOUTUBE_SCOPE],
    });
    const token = extractAccessToken(result);

    if (!token) {
      throw createOAuthError("Google did not return an access token.");
    }

    await writeStoredAccessToken(token);
    return token;
  } catch (error) {
    if (!interactive) {
      throw createOAuthError("YouTube login is required before loading playlists.");
    }

    throw createOAuthError(getErrorMessage(error));
  }
}

export function hasConfiguredYouTubeAuth(): boolean {
  return isYouTubeClientIdConfigured();
}

export async function getYouTubeAccessToken(options?: {
  interactive?: boolean;
}): Promise<string> {
  const interactive = options?.interactive ?? false;

  if (!isYouTubeClientIdConfigured()) {
    throw createOAuthError(
      "YouTube is not configured yet. Add VITE_YOUTUBE_CLIENT_ID to .env first.",
    );
  }

  return requestChromeIdentityToken(interactive);
}

export async function invalidateYouTubeAccessToken(token?: string): Promise<void> {
  const tokenToRemove = token ?? (await readStoredAccessToken());
  await chrome.storage.local.remove([AUTH_TOKEN_KEY]);

  if (!tokenToRemove) {
    return;
  }

  try {
    await chrome.identity.removeCachedAuthToken({ token: tokenToRemove });
  } catch {
    // If Chrome already dropped the token, we're still fine.
  }
}

export async function clearYouTubeAuthState(): Promise<void> {
  await invalidateYouTubeAccessToken();
}
