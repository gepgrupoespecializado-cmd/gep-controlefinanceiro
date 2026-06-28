import { logAppError } from "./safe-error";

let registered = false;

export function registerServiceWorker() {
  if (registered || typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  registered = true;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => logAppError(error, { boundary: "service_worker_registration" }));
  });
}