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
      className={`w-full overflow-x-auto rounded-2xl border border-white/[0.06] bg-surface-1 shadow-[0_8px_30px_rgb(0,0,0,0.4)] ${className}`}
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] bg-[#0B110E]">
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
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-txt-secondary ${alignClass}`}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04] text-xs">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-xs text-txt-tertiary"
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
                    ? "cursor-pointer hover:bg-[#16211C]"
                    : "hover:bg-[#16211C]/50"
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
                      className={`px-4 py-3 text-txt-primary ${alignClass}`}
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
