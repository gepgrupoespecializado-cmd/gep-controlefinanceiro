import { reportLovableError } from "./lovable-error-reporting";

const ERROR_LOG_KEY = "gep_error_log_v1";
const MAX_LOGS = 50;

type ErrorContext = Record<string, unknown>;

type StoredError = {
  at: string;
  route?: string;
  message: string;
  stack?: string;
  context: ErrorContext;
};

let installedGlobalHandlers = false;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || "Erro desconhecido";
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error) || "Erro desconhecido";
  } catch {
    return "Erro desconhecido";
  }
}

function errorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

export function logAppError(error: unknown, context: ErrorContext = {}) {
  if (typeof window === "undefined") return;

  const entry: StoredError = {
    at: new Date().toISOString(),
    route: window.location.pathname,
    message: errorMessage(error),
    stack: errorStack(error),
    context,
  };

  try {
    const current = JSON.parse(window.localStorage.getItem(ERROR_LOG_KEY) || "[]");
    const list = Array.isArray(current) ? current : [];
    window.localStorage.setItem(ERROR_LOG_KEY, JSON.stringify([entry, ...list].slice(0, MAX_LOGS)));
  } catch {
    // Se o armazenamento estiver indisponível/cheio, a interface continua funcionando.
  }

  try {
    reportLovableError(error, context);
  } catch {
    // O registro remoto nunca deve derrubar o aplicativo.
  }
}

export function installGlobalErrorHandlers() {
  if (typeof window === "undefined" || installedGlobalHandlers) return;
  installedGlobalHandlers = true;

  window.addEventListener(
    "error",
    (event) => {
      logAppError(event.error ?? event.message, {
        boundary: "window_error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      event.preventDefault();
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event) => {
    logAppError(event.reason, { boundary: "unhandledrejection" });
    event.preventDefault();
  });
}