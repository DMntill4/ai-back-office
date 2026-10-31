import React from "react";
import { motion } from "motion/react";

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
  selectedId?: string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedId,
  emptyMessage = "No se encontraron registros.",
  className = "",
}: DataTableProps<T>) {
  return (
    <div data-lenis-prevent className={`w-full min-w-0 overflow-x-auto custom-scrollbar rounded-container border border-border bg-panel ${className}`}>
      <table className="w-full min-w-[640px] text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-canvas/60">
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
                  className={`px-4 h-10 text-label font-medium text-secondary ${alignClass}`}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-caption text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const id = keyExtractor(item);
              const isSelected = selectedId === id;

              return (
                <motion.tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.16, ease: "easeOut", delay: Math.min(index, 5) * 0.025 }}
                  className={`h-10 transition-colors ${
                    isSelected
                      ? "bg-raised text-primary"
                      : onRowClick
                      ? "cursor-pointer hover:bg-raised/50"
                      : "hover:bg-raised/30"
                  }`}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === "right"
                        ? "text-right font-sans tabular-nums"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left";
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-2 text-primary ${alignClass}`}
                      >
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
