import React, { useState } from "react";
import { Check, Copy, CheckCircle2, AlertCircle, Info, Database } from "lucide-react";
import { Button } from "../ui/Button";

interface GenericDataWidgetProps {
  command: string;
  args?: Record<string, string>;
  data?: any;
}

export const GenericDataWidget: React.FC<GenericDataWidgetProps> = ({
  command,
  args = {},
  data,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Si data es un array de objetos (ej. lista de proveedores, clientes, flota, fuentes)
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    const keys = Object.keys(data[0]).slice(0, 5); // Limitar a 5 columnas clave

    return (
      <div className="space-y-compact">
        <div className="flex items-center justify-between text-caption text-secondary">
          <span>{data.length} registros devueltos por {command}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check className="w-3.5 h-3.5 text-state-ok" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-card-sm border border-border bg-panel">
          <table className="w-full text-caption text-left">
            <thead className="bg-raised text-secondary font-medium border-b border-border">
              <tr>
                {keys.map((k) => (
                  <th key={k} className="py-2 px-3 uppercase text-[11px] font-mono tracking-wider">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.slice(0, 8).map((row, idx) => (
                <tr key={idx} className="hover:bg-raised/50 transition-colors">
                  {keys.map((k) => (
                    <td key={k} className="py-2 px-3 text-primary font-mono truncate max-w-xs">
                      {typeof row[k] === "boolean" ? (
                        row[k] ? "Sí" : "No"
                      ) : typeof row[k] === "object" ? (
                        JSON.stringify(row[k])
                      ) : (
                        String(row[k] ?? "—")
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Si data es un objeto con propiedades estructuradas
  const entries = data && typeof data === "object" ? Object.entries(data) : [];

  return (
    <div className="space-y-compact">
      <div className="flex items-center justify-between text-caption text-secondary">
        <span className="flex items-center gap-1.5 font-medium">
          <Info className="w-3.5 h-3.5 text-brand" />
          Resultado estructurado de la operación
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          icon={copied ? <Check className="w-3.5 h-3.5 text-state-ok" /> : <Copy className="w-3.5 h-3.5" />}
        >
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-compact">
        {entries.map(([key, val]) => (
          <div
            key={key}
            className="p-compact rounded-control bg-raised border border-border space-y-0.5"
          >
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted block truncate">
              {key}
            </span>
            <div className="text-body font-mono font-medium text-primary truncate">
              {typeof val === "boolean" ? (
                val ? (
                  <span className="text-state-ok inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                  </span>
                ) : (
                  <span className="text-state-attention inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Inactivo
                  </span>
                )
              ) : typeof val === "object" ? (
                JSON.stringify(val)
              ) : (
                String(val ?? "—")
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
