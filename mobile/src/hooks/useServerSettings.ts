import { useSyncExternalStore } from "react";
import { getServerSettings, initializeServerSettings, subscribeServerSettings } from "../api/serverSettings";

void initializeServerSettings();

export function useServerSettings() {
  return useSyncExternalStore(subscribeServerSettings, getServerSettings, getServerSettings);
}
