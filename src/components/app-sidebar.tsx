import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Calendar,
  Wallet,
  Building2,
  History,
  Trash,
  BookOpen,
  Calculator,
  Scale,
  ShieldCheck,
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

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Serviços", url: "/servicos", icon: Wrench },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  { title: "Modelos", url: "/modelos", icon: BookOpen },
  { title: "Precificação", url: "/precificacao", icon: Calculator },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Histórico", url: "/historico", icon: History },
  { title: "Lixeira", url: "/lixeira", icon: Trash },
  { title: "Empresa", url: "/empresa", icon: Building2 },
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

  function handleNavigate() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          {data.empresa.logoDataUrl ? (
            <img src={data.empresa.logoDataUrl} alt="Logo" className="h-9 w-9 shrink-0 rounded-lg object-contain bg-white border" />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground font-black">
              G
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">Controle de Prestação</p>
              <p className="truncate text-[10px] text-sidebar-foreground/60">de Serviços GEP</p>
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
                      <Link to={item.url} className="flex items-center gap-2" onClick={handleNavigate}>
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
      </SidebarContent>
    </Sidebar>
  );
}