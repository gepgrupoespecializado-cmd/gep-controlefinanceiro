import { logAppError } from "./safe-error";

let registered = false;

export function registerServiceWorker() {
  if (registered || typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  registered = true;

  const register = () => {
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((error) => logAppError(error, { boundary: "service_worker_registration" }));
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}