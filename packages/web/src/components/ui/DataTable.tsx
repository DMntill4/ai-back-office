import React from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "No se encontraron registros.",
  className = "",
}: DataTableProps<T>) {
  return (
    <div
      className={`w-full overflow-x-auto rounded-xl border border-forest-border bg-forest-card shadow-subtle ${className}`}
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-forest-border bg-forest-surface/80">
            {columns.map((col) => {
              const alignClass =
                col.align === "right"
                  ? "text-right"
                  : col.align === "center"
                  ? "text-center"
                  : "text-left";
              return (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-3.5 py-2.5 text-[11px] font-medium text-txt-secondary ${alignClass}`}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-forest-border/50 text-xs">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-txt-tertiary"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={`transition-colors ${
                  onRowClick
                    ? "cursor-pointer hover:bg-forest-surface/60"
                    : "hover:bg-forest-surface/30"
                }`}
              >
                {columns.map((col) => {
                  const alignClass =
                    col.align === "right"
                      ? "text-right font-mono tabular-nums"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left";
                  return (
                    <td
                      key={col.key}
                      className={`px-3.5 py-2.5 text-txt-primary ${alignClass}`}
                    >
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

