export type ActionStatusKind = "saved" | "removed" | "warning";

export const SET_ACTION_STATUS_MESSAGE = "action-status:set";
export const CLEAR_ACTION_STATUS_MESSAGE = "action-status:clear";

interface ActionStatusAppearance {
  text: string;
  backgroundColor: string;
  textColor?: string;
}

export interface SetActionStatusMessage {
  type: typeof SET_ACTION_STATUS_MESSAGE;
  status: ActionStatusKind;
  tabId?: number;
}

export interface ClearActionStatusMessage {
  type: typeof CLEAR_ACTION_STATUS_MESSAGE;
  tabId?: number;
}

const ACTION_STATUS_APPEARANCE: Record<
  ActionStatusKind,
  ActionStatusAppearance
> = {
  saved: {
    text: "✓",
    backgroundColor: "#16A34A",
    textColor: "#FFFFFF",
  },
  removed: {
    text: "−",
    backgroundColor: "#2563EB",
    textColor: "#FFFFFF",
  },
  warning: {
    text: "!",
    backgroundColor: "#DC2626",
    textColor: "#FFFFFF",
  },
};

export function isSetActionStatusMessage(
  value: unknown,
): value is SetActionStatusMessage {
  return (
    !!value &&
    typeof value === "object" &&
    "type" in value &&
    "status" in value &&
    value.type === SET_ACTION_STATUS_MESSAGE &&
    (value.status === "saved" ||
      value.status === "removed" ||
      value.status === "warning")
  );
}

export function isClearActionStatusMessage(
  value: unknown,
): value is ClearActionStatusMessage {
  return (
    !!value &&
    typeof value === "object" &&
    "type" in value &&
    value.type === CLEAR_ACTION_STATUS_MESSAGE
  );
}

export async function setActionStatusBadge(
  status: ActionStatusKind,
  tabId?: number,
): Promise<void> {
  const appearance = ACTION_STATUS_APPEARANCE[status];
  const details = tabId === undefined ? {} : { tabId };

  await Promise.all([
    chrome.action.setBadgeText({ text: appearance.text, ...details }),
    chrome.action.setBadgeBackgroundColor({
      color: appearance.backgroundColor,
      ...details,
    }),
  ]);

  if (appearance.textColor) {
    try {
      await chrome.action.setBadgeTextColor({
        color: appearance.textColor,
        ...details,
      });
    } catch {
      // Badge text color is optional; ignore when unavailable.
    }
  }
}

export function clearActionStatusBadge(tabId?: number): Promise<void> {
  return chrome.action.setBadgeText({
    text: "",
    ...(tabId === undefined ? {} : { tabId }),
  });
}
