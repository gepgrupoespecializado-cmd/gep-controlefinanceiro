import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { OnlineStatus } from "@/components/online-status";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    if (typeof sessionStorage === "undefined") return;
    const key = `gep_recovery_attempt:${window.location.pathname}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const timer = window.setTimeout(() => {
      router.invalidate();
      reset();
    }, 250);
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
    <div className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Modo seguro</p>
          <h1 className="mt-2 text-2xl font-black">Controle de Prestação de Serviços GEP</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O sistema abriu uma versão simplificada para manter o acesso ativo.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Recarregar tela
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Home
            </a>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Clientes", "/clientes"],
            ["Orçamentos", "/orcamentos"],
            ["Agenda", "/agenda"],
            ["Financeiro", "/financeiro"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="rounded-lg border border-border bg-card p-4 text-sm font-semibold hover:bg-accent">
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
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
      { property: "og:title", content: "Controle de Prestação de Serviços GEP" },
      {
        property: "og:description",
        content: "Gestão completa: clientes, orçamentos, agenda e financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Controle de Prestação de Serviços GEP" },
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

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/80 backdrop-blur px-3 sm:px-4">
              <SidebarTrigger />
              <div className="ml-1 min-w-0">
                <p className="truncate text-sm font-semibold">Controle de Prestação de Serviços GEP</p>
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
      </SidebarProvider>
    </QueryClientProvider>
  );
}
