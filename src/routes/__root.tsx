import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { OnlineStatus } from "@/components/online-status";
import { installGlobalErrorHandlers, logAppError } from "@/lib/safe-error";
import { isPublicRoute } from "@/lib/auth";
import {
  initOrgSync,
  loadOrgContext,
  getIsolatedSession,
  watchSessionIsolation,
  SessionChangedError,
} from "@/data/cloud-sync";
import { supabase } from "@/integrations/supabase/client";
import { cleanPwaSession, ensureSafePwa, registerServiceWorker } from "@/lib/pwa";
import { InstallPrompt } from "@/components/install-prompt";
import { SplashScreen } from "@/components/splash-screen";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">Esta página não existe ou foi movida.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    logAppError(error, { boundary: "tanstack_root_error_component" });
    if (typeof sessionStorage === "undefined") return;
    const key = `gep_recovery_attempt:${window.location.pathname}`;
    const attempts = parseInt(sessionStorage.getItem(key) || "0", 10);
    if (attempts >= 2) return;
    sessionStorage.setItem(key, String(attempts + 1));
    const timer = window.setTimeout(() => {
      router.invalidate();
      reset();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [error]);

  return (
    <SafeHomeFallback
      onRetry={() => {
        router.invalidate();
        reset();
      }}
    />
  );
}

function SafeHomeFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Carregando…</p>
        <button
          onClick={onRetry}
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

// Stop waiting even when an old transport ignores abort. Its data-side scope
// checks still prevent writes, listeners and synchronization from resurfacing.
function waitForCurrentOperation<T>(operation: Promise<T>, signals: AbortSignal[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => signals.forEach((signal) => signal.removeEventListener("abort", cancel));
    const cancel = () => {
      cleanup();
      reject(new SessionChangedError());
    };
    for (const signal of signals) signal.addEventListener("abort", cancel, { once: true });
    operation.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
    if (signals.some((signal) => signal.aborted)) cancel();
  });
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  beforeLoad: async ({ location, context, abortController }) => {
    if (typeof window === "undefined") return;
    watchSessionIsolation(() => {
      void context.queryClient.cancelQueries();
      context.queryClient.clear();
    });
    const routeSignal = abortController.signal;
    while (!routeSignal.aborted) {
      try {
        await waitForCurrentOperation(ensureSafePwa(), [routeSignal]);
        const session = await waitForCurrentOperation(getIsolatedSession(), [routeSignal]);
        const { user } = session;
        const publica = isPublicRoute(location.pathname);
        const redirectCurrent = async (
          to: "/login" | "/" | "/bem-vindo" | "/migrar-dados",
          scope: { assertCurrent: () => void } = session,
        ) => {
          const latest = await waitForCurrentOperation(getIsolatedSession(), [routeSignal]);
          scope.assertCurrent();
          latest.assertCurrent();
          if (latest.user?.id !== user?.id) throw new SessionChangedError();
          if (!routeSignal.aborted) throw redirect({ to });
        };

        session.assertCurrent();
        if (!user) {
          if (!publica) await redirectCurrent("/login");
          return;
        }
        if (location.pathname === "/login") {
          await redirectCurrent("/");
          return;
        }
        if (publica) return;

        const { orgId, scope } = await waitForCurrentOperation(loadOrgContext(), [
          routeSignal,
          session.signal,
        ]);
        scope?.assertCurrent();
        if (!orgId) {
          if (location.pathname !== "/bem-vindo") await redirectCurrent("/bem-vindo", scope);
          return;
        }
        if (location.pathname === "/bem-vindo") {
          await redirectCurrent("/", scope);
          return;
        }
        const sync = await waitForCurrentOperation(initOrgSync(orgId), [
          routeSignal,
          scope?.signal ?? session.signal,
        ]);
        scope?.assertCurrent();
        if (sync.status === "migracao_pendente") {
          if (location.pathname !== "/migrar-dados") await redirectCurrent("/migrar-dados", scope);
          return;
        }
        if (location.pathname === "/migrar-dados") await redirectCurrent("/", scope);
        return;
      } catch (error) {
        // A superseded route finishes silently. A still-current route must
        // acquire a fresh scope and complete its guard before it can render.
        if (routeSignal.aborted) return;
        if (!(error instanceof SessionChangedError)) throw error;
      }
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Controle de Prestação de Serviços GEP" },
      {
        name: "description",
        content:
          "Sistema profissional de gestão de clientes, orçamentos, agenda e financeiro para prestadores de serviços.",
      },
      { name: "author", content: "GEP Serviços Especializado" },
      { name: "theme-color", content: "#0b1b3d" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      { name: "apple-mobile-web-app-title", content: "GEP Serviços" },
      { name: "application-name", content: "GEP Serviços" },
      {
        property: "og:title",
        content: "Controle de Prestação de Serviços GEP",
      },
      {
        property: "og:description",
        content: "Gestão completa: clientes, orçamentos, agenda e financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: "Controle de Prestação de Serviços GEP",
      },
      {
        name: "twitter:description",
        content: "Gestão completa: clientes, orçamentos, agenda e financeiro.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const router = useRouter();

  useEffect(() => {
    installGlobalErrorHandlers();
    void registerServiceWorker()?.catch((error) =>
      logAppError(error, { boundary: "service_worker_registration" }),
    );
  }, []);

  useEffect(() => {
    let identity: string | null | undefined;
    let disposed = false;
    let authRevision = 0;
    let cancelWait: (() => void) | undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextIdentity = session?.user.id ?? null;
      const changed = identity !== nextIdentity;
      identity = nextIdentity;
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const revision = ++authRevision;
      cancelWait?.();
      // Do not await asynchronous work inside the Supabase auth callback.
      void (async () => {
        if (changed || event === "SIGNED_OUT") await cleanPwaSession();
        if (disposed || revision !== authRevision) return;
        // Let the active navigation finish before scheduling an auth refresh.
        // A newer auth event or unmount releases this wait without navigating.
        if (router.state.status === "pending") {
          await new Promise<void>((resolve) => {
            const finish = () => {
              unsubscribe();
              resolve();
            };
            const unsubscribe = router.subscribe("onResolved", finish);
            cancelWait = finish;
          });
        }
        while (!disposed && revision === authRevision) {
          try {
            const current = await getIsolatedSession();
            if (disposed || revision !== authRevision) return;
            current.assertCurrent();
            if (router.state.location.pathname === "/login" && current.user)
              await router.navigate({ to: "/" });
            else await router.invalidate();
            return;
          } catch (error) {
            if (!(error instanceof SessionChangedError)) throw error;
          }
        }
      })().catch((error) => logAppError(error, { boundary: "pwa_session_change" }));
    });
    return () => {
      disposed = true;
      cancelWait?.();
      data.subscription.unsubscribe();
    };
  }, [router]);

  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const semLayout =
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/bem-vindo" ||
    pathname === "/migrar-dados";

  if (semLayout) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/80 backdrop-blur px-3 sm:px-4">
              <SidebarTrigger />
              <div className="ml-1 min-w-0">
                <p className="truncate text-sm font-semibold">
                  Controle de Prestação de Serviços GEP
                </p>
              </div>
              <div className="ml-auto">
                <OnlineStatus />
              </div>
            </header>
            <main className="flex-1 p-3 sm:p-6 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
        <Toaster richColors position="top-right" />
        <InstallPrompt />
        <SplashScreen />
      </SidebarProvider>
    </QueryClientProvider>
  );
}
