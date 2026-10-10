import { useCompanyName } from "@/hooks/use-company-name";
import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "gep_install_dismissed_at";
const DISMISS_DAYS = 7;

function recentlyDismissed() {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const companyName = useCompanyName();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS: no beforeinstallprompt — show our own banner after a brief delay
    let t: number | undefined;
    if (isIOS()) {
      t = window.setTimeout(() => setShow(true), 1800);
    }

    const onInstalled = () => {
      setShow(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      if (t) window.clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setShow(false);
    setIosOpen(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setShow(false);
    } else if (isIOS()) {
      setIosOpen(true);
    }
  };

  if (!show && !iosOpen) return null;

  return (
    <>
      {show && !iosOpen && (
        <div className="fixed inset-x-0 bottom-3 z-50 mx-auto w-[min(96%,520px)] rounded-xl border border-border bg-card p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Adicionar à tela inicial?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Instale {companyName} para acesso rápido e uso offline.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={install}>
                  📲 Instalar Agora
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Mais Tarde
                </Button>
              </div>
            </div>
            <button
              aria-label="Fechar"
              onClick={dismiss}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {iosOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={dismiss}>
          <div
            className="w-[min(96%,460px)] rounded-2xl bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-bold">Instalar no iPhone / iPad</p>
              <button onClick={dismiss} className="rounded-md p-1 hover:bg-accent" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span className="flex items-center gap-1">
                  Toque no botão <Share className="inline h-4 w-4" /> <b>Compartilhar</b> do Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span className="flex items-center gap-1">
                  Selecione <Plus className="inline h-4 w-4" /> <b>Adicionar à Tela de Início</b>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Confirme tocando em <b>Adicionar</b>.</span>
              </li>
            </ol>
            <Button className="mt-5 w-full" onClick={dismiss}>
              Entendi
            </Button>
          </div>
        </div>
      )}
    </>
  );
}