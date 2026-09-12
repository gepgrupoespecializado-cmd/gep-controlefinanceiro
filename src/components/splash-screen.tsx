import { useEffect, useState } from "react";

const SESSION_KEY = "gep_splash_shown";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-white animate-in fade-in duration-300"
      style={{ background: "linear-gradient(160deg,#0b1b3d 0%,#15306b 100%)" }}
    >
      <div className="grid h-28 w-28 place-items-center rounded-3xl bg-white/10 shadow-2xl ring-1 ring-white/20 backdrop-blur">
        <span className="text-4xl font-black tracking-tight">GEP</span>
      </div>
      <h1 className="mt-6 px-6 text-center text-lg font-bold tracking-tight">
        Controle de Prestação de Serviços GEP
      </h1>
      <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/70">
        Enterprise Premium 1.5
      </p>
      <p className="mt-8 text-[11px] text-white/50">Eduardo Pennicha · GEP Grupo Especializado</p>
      <div className="absolute bottom-8 flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70 [animation-delay:300ms]" />
      </div>
    </div>
  );
}