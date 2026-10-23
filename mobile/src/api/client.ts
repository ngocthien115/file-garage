import axios from "axios";
import { DEFAULT_BASE_URL, getServerSettings, initializeServerSettings, subscribeServerSettings } from "./serverSettings";

const client = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

function applyServerSettings() {
  client.defaults.baseURL = getServerSettings().baseURL;
}

subscribeServerSettings(applyServerSettings);
export const clientReady = initializeServerSettings().then(applyServerSettings);

export default client;
