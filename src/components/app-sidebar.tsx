import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Calendar,
  Wallet,
  Settings,
  Calculator,
  Scale,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useDB } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { stopOrgSync } from "@/data/cloud-sync";
import { cleanPwaSession } from "@/lib/pwa";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Prestação de Serviços", url: "/prestacao-de-servicos", icon: Wrench },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Precificação", url: "/precificacao", icon: Calculator },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Equipe", url: "/equipe", icon: Users },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const legalItems = [
  { title: "Termos de Uso", url: "/termos-de-uso", icon: Scale },
  { title: "Privacidade", url: "/politica-de-privacidade", icon: ShieldCheck },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const data = useDB();

  async function sair() {
    // Invalidate locally and across tabs before cache cleanup or HTTP sign-out.
    stopOrgSync();
    try {
      await cleanPwaSession();
      const { error } = await supabase.auth.signOut();
      if (error)
        console.warn(
          "Logout remoto não confirmado; sessão local bloqueada.",
          error,
        );
    } catch (error) {
      console.warn(
        "Logout remoto não confirmado; sessão local bloqueada.",
        error,
      );
    } finally {
      await cleanPwaSession();
      window.location.assign("/login");
    }
  }

  function handleNavigate() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          {data.empresa.logoDataUrl ? (
            <img
              src={data.empresa.logoDataUrl}
              alt="Logo"
              className="h-9 w-9 shrink-0 rounded-lg object-contain bg-white border"
            />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground font-black">
              G
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">
                Controle de Prestação
              </p>
              <p className="truncate text-[10px] text-sidebar-foreground/60">
                de Serviços GEP
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={item.url}
                        className="flex items-center gap-2"
                        onClick={handleNavigate}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Legal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {legalItems.map((item) => {
                const active = pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={item.url}
                        className="flex items-center gap-2"
                        onClick={handleNavigate}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={sair}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
