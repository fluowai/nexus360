import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-xl max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">Ops! Algo deu errado.</h2>
              <p className="text-gray-500 text-sm">
                Desculpe o inconveniente. Ocorreu um erro inesperado nesta parte do sistema.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-all font-bold mx-auto shadow-lg shadow-blue-100"
            >
              <RefreshCw size={18} />
              Recarregar Página
            </button>
            {import.meta.env.DEV && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-600">{this.state.error?.message}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
