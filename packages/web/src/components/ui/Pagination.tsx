import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  totalItems,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-compact border-t border-border pt-compact"
    >
      <span className="text-caption text-secondary" aria-live="polite">
        Mostrando {firstItem}–{lastItem} de {totalItems}
      </span>
      <div className="flex items-center gap-hairline">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 items-center gap-hairline rounded-control border border-border px-compact text-caption text-secondary transition-colors hover:bg-raised hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <span className="px-compact text-caption font-mono text-primary" aria-current="page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-8 items-center gap-hairline rounded-control border border-border px-compact text-caption text-secondary transition-colors hover:bg-raised hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página siguiente"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
};
