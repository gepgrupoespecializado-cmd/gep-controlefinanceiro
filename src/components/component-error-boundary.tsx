import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { logAppError } from "@/lib/safe-error";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
};

type State = {
  failed: boolean;
};

export class ComponentErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    logAppError(error, {
      boundary: "component_error_boundary",
      component: this.props.name ?? "sem nome",
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback ?? <ComponentLoadFallback />;
    }

    return this.props.children;
  }
}

export function ComponentLoadFallback() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span>Não foi possível carregar este componente.</span>
      </div>
    </div>
  );
}