import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export interface ErrorBoundaryProps {
    /** Identificador de la vista, usado para reiniciar el boundary al navegar. */
    viewKey?: string;
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary por vista.
 *
 * Evita que un error de render en una vista deje la aplicación en blanco.
 * Se estiliza exclusivamente con tokens semánticos de Mint-DESIGN.md
 * (bg-panel, border-border, text-primary, text-secondary, bg-brand, etc.).
 */
export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Reporte a consola para diagnóstico (sin exponer datos sensibles en UI).
        // eslint-disable-next-line no-console
        console.error("[ErrorBoundary] Vista falló al renderizar:", error, errorInfo);
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps): void {
        // Si cambia la vista activa, limpiamos el estado de error para permitir
        // que la nueva vista se monte normalmente.
        if (
            this.state.hasError &&
            prevProps.viewKey !== this.props.viewKey
        ) {
            this.setState({ hasError: false, error: null });
        }
    }

    private handleReload = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): React.ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="flex-1 h-full w-full flex items-center justify-center bg-canvas p-group">
                <div className="w-full max-w-md rounded-container bg-panel border border-border p-group space-y-group">
                    <div className="flex items-start gap-compact">
                        <div className="w-10 h-10 rounded-container bg-raised border border-border flex items-center justify-center text-state-error shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="space-y-hairline min-w-0">
                            <h2 className="text-page-title font-semibold text-primary">
                                Esta vista no pudo cargarse
                            </h2>
                            <p className="text-body text-secondary">
                                Ocurrió un error inesperado al renderizar el contenido. Puedes
                                recargar la vista sin perder el resto de la aplicación.
                            </p>
                        </div>
                    </div>

                    {this.state.error?.message ? (
                        <pre className="text-mono text-caption text-secondary bg-raised border border-border rounded-control p-compact overflow-x-auto whitespace-pre-wrap break-words">
                            {this.state.error.message}
                        </pre>
                    ) : null}

                    <div className="flex items-center gap-compact">
                        <button
                            type="button"
                            onClick={this.handleReload}
                            className="inline-flex items-center gap-hairline rounded-control bg-brand text-canvas px-compact py-hairline text-body font-medium hover:opacity-90 transition-opacity"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Recargar vista
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
