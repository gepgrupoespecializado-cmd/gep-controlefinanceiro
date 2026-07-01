import { useEffect, useState } from "react";
import { Download, Smartphone, RefreshCw, CheckCircle2, Share, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { APP_VERSION, APP_NAME } from "@/lib/version";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true
  );
}

export function InstallAppCard() {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("Aplicativo instalado com sucesso!");
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        if (reg.waiting) setUpdateReady(true);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        setDeferred(null);
      }
      return;
    }
    if (platform === "ios") {
      setShowIOS(true);
      return;
    }
    toast.info("Use o menu do navegador → 'Instalar aplicativo' ou 'Adicionar à tela inicial'.");
  };

  const checkUpdates = async () => {
    setChecking(true);
    try {
      if (!("serviceWorker" in navigator)) {
        toast.error("Atualização automática não suportada neste navegador.");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        toast.info("Instale o aplicativo para receber atualizações automáticas.");
        return;
      }
      await reg.update();
      // Give the browser a beat to detect new SW
      await new Promise((r) => setTimeout(r, 800));
      if (reg.waiting || updateReady) {
        setUpdateReady(true);
        toast.success("Nova versão disponível! Toque em 'Atualizar agora'.");
      } else {
        toast.success(`Você já está na versão mais recente (v${APP_VERSION}).`);
      }
    } catch {
      toast.error("Não foi possível verificar atualizações.");
    } finally {
      setChecking(false);
    }
  };

  const applyUpdate = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  };

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-[var(--primary-glow,#1e40af)] text-white">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-black">📲 Instalar aplicativo GEP</p>
            <p className="text-xs text-muted-foreground">
              Acesso rápido, ícone na tela inicial, tela cheia e uso offline.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono">v{APP_VERSION}</span>
              {installed ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Instalado
                </span>
              ) : (
                <span>Plataforma: {platform === "ios" ? "iPhone/iPad" : platform === "android" ? "Android" : "Desktop"}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!installed && (
            <Button size="sm" onClick={install}>
              <Download className="h-4 w-4" /> 📲 Instalar Aplicativo
            </Button>
          )}
          {updateReady ? (
            <Button size="sm" variant="default" onClick={applyUpdate} className="bg-emerald-600 hover:bg-emerald-700">
              <RefreshCw className="h-4 w-4" /> Atualizar agora
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={checkUpdates} disabled={checking}>
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              ⬇️ Baixar / Verificar atualização
            </Button>
          )}
        </div>

        {showIOS && (
          <div className="mt-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="font-semibold">Instalar no iPhone / iPad</p>
            <ol className="mt-2 space-y-1.5 text-xs">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span className="flex items-center gap-1">
                  Toque em <Share className="inline h-3.5 w-3.5" /> <b>Compartilhar</b> no Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span className="flex items-center gap-1">
                  Selecione <Plus className="inline h-3.5 w-3.5" /> <b>Adicionar à Tela de Início</b>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Confirme em <b>Adicionar</b>. O app <b>{APP_NAME}</b> aparecerá na tela inicial.</span>
              </li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}