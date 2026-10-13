const POLICY_VERSION = 2;
const TIMEOUT_MS = 2500;
let registration: Promise<ServiceWorkerRegistration> | undefined;
let checking: Promise<void> | undefined;

function withTimeout<T>(promise: Promise<T>, timeout = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "Não foi possível confirmar a atualização segura do aplicativo. Conecte-se e tente novamente.",
          ),
        ),
      timeout,
    );
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration> | undefined {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!registration) {
    registration = navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch((error) => {
        registration = undefined;
        throw error;
      });
  }
  return registration;
}

function askPolicy(
  worker: ServiceWorker,
  type: "GEP_PWA_POLICY" | "GEP_PWA_CLEAN",
): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (safe: boolean) => {
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      resolve(safe);
    };
    const timer = setTimeout(() => finish(false), TIMEOUT_MS);
    channel.port1.onmessage = ({ data }) =>
      finish(data?.policy === POLICY_VERSION && data?.clean === true);
    try {
      worker.postMessage({ type }, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}

async function checkPolicy() {
  const previous = navigator.serviceWorker.controller;
  if (
    previous &&
    (await askPolicy(previous, "GEP_PWA_POLICY")) &&
    navigator.serviceWorker.controller === previous
  )
    return;
  const pending = registerServiceWorker();
  if (!pending) return;
  const reg = await withTimeout(pending, 10000);
  // register/update completing is not proof that the controller is safe.
  await withTimeout(reg.update(), 10000);
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const worker = navigator.serviceWorker.controller;
    if (
      worker &&
      (await askPolicy(worker, "GEP_PWA_POLICY")) &&
      navigator.serviceWorker.controller === worker
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Atualização de segurança pendente. Conecte-se à internet e tente novamente.");
}

/** Must complete before session/data requests. Never accepts an unverified controller. */
export async function ensureSafePwa(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!checking)
    checking = checkPolicy().finally(() => {
      checking = undefined;
    });
  return checking;
}

/** Best effort on logout; failures must not prevent signing out. No personal data is sent. */
export async function cleanPwaSession(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const worker = "serviceWorker" in navigator ? navigator.serviceWorker.controller : null;
    if (worker && (await askPolicy(worker, "GEP_PWA_CLEAN"))) return;
    if ("caches" in window) {
      await withTimeout(
        (async () => {
          const names = await caches.keys();
          await Promise.all(
            names
              .filter(
                (name) =>
                  /^(gep-servicos-shell-v\d+|gep-static-v\d+)$/.test(name) &&
                  name !== "gep-static-v2",
              )
              .map((name) => caches.delete(name)),
          );
        })(),
      );
    }
  } catch {
    // The next route check retries cleanup and refuses an unsafe controller.
    console.warn("Limpeza do cache PWA pendente; será verificada novamente na próxima entrada.");
  }
}
