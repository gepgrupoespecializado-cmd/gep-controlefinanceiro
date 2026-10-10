import { useCompanyName } from "@/hooks/use-company-name";
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
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { OnlineStatus } from "@/components/online-status";
import { installGlobalErrorHandlers, logAppError } from "@/lib/safe-error";
import { getSessionUser, isPublicRoute } from "@/lib/auth";
import { initOrgSync, loadOrgContext } from "@/data/cloud-sync";
import { supabase } from "@/integrations/supabase/client";
import { registerServiceWorker } from "@/lib/pwa";
import { InstallPrompt } from "@/components/install-prompt";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta página não existe ou foi movida.
        </p>
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

function ErrorComponent({ error, reset }: ErrorComponentProps) {
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  beforeLoad: async ({ location }) => {
if (typeof window === "undefined") return;

    const user = await getSessionUser();
    const publica = isPublicRoute(location.pathname);

    if (!user) {
      if (!publica) throw redirect({ to: "/login" });
      return;
    }
    if (location.pathname === "/login") {
      throw redirect({ to: "/" });
    }
    if (publica) return;

    const { orgId } = await loadOrgContext();
    if (!orgId) {
      if (location.pathname !== "/bem-vindo") throw redirect({ to: "/bem-vindo" });
      return;
    }
    if (location.pathname === "/bem-vindo") throw redirect({ to: "/" });
    const sync = await initOrgSync(orgId);
    if (sync.status === "migracao_pendente") {
      if (location.pathname !== "/migrar-dados") throw redirect({ to: "/migrar-dados" });
      return;
    }
    if (location.pathname === "/migrar-dados") throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gestão de Serviços" },
      {
        name: "description",
        content:
          "Sistema profissional de gestão de clientes, orçamentos, agenda e financeiro para prestadores de serviços.",
      },
      { name: "author", content: "Gestão de Serviços" },
      { name: "theme-color", content: "#0b1b3d" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Gestão de Serviços" },
      { name: "application-name", content: "Gestão de Serviços" },
      { property: "og:title", content: "Gestão de Serviços" },
      {
        property: "og:description",
        content: "Gestão completa: clientes, orçamentos, agenda e financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Gestão de Serviços" },
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
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const companyName = useCompanyName();
  useEffect(() => {
    if (isPublicRoute(pathname) || pathname === "/bem-vindo") return;
    const section = document.title.split(" — ")[0];
    document.title = `${section} — ${companyName}`;
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      document.querySelector(selector)?.setAttribute("content", document.title);
    }
    for (const name of ["application-name", "apple-mobile-web-app-title"]) {
      document.querySelector(`meta[name="${name}"]`)?.setAttribute("content", companyName);
    }
  }, [companyName, pathname]);
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
                <p className="truncate text-sm font-semibold">{companyName}</p>
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
      </SidebarProvider>
    </QueryClientProvider>
  );
}
