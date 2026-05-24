"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PremiumPaginationProps {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  currentItemsCount: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limitOptions?: number[];
}

export function PremiumPagination({
  totalItems,
  currentPage,
  itemsPerPage,
  currentItemsCount,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50],
}: PremiumPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = (currentPage - 1) * itemsPerPage + currentItemsCount;

  if (totalItems === 0) return null;

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      }
      if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }

      if (start > 2) pages.push(-1); // ellipsis placeholder
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push(-2); // ellipsis placeholder

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4 py-2">
      {/* LIGNE 1 (mobile) / Section gauche (desktop): Compteur items */}
      <div className="flex justify-center md:justify-start text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground mx-0.5">{startItem}</span>–
        <span className="font-medium text-foreground mx-0.5">{endItem}</span> of{" "}
        <span className="font-medium text-foreground mx-0.5">{totalItems}</span> items
      </div>

      {/* LIGNE 2 (mobile) / Section centre (desktop): Per page selector */}
      <div className="flex items-center justify-center md:justify-start gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Per page:</span>
        <Select
          value={String(itemsPerPage)}
          onValueChange={(val) => onLimitChange(Number(val))}
        >
          <SelectTrigger className="h-8 w-[70px] border-border bg-background text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {limitOptions.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* LIGNE 3 (mobile) / Section droite (desktop): Boutons navigation */}
      <div className="flex items-center justify-center md:justify-end gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((pageNum) =>
          pageNum < 0 ? (
            <span
              key={pageNum}
              className="text-sm text-muted-foreground px-1 select-none"
            >
              …
            </span>
          ) : (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? "default" : "outline"}
              size="icon"
              className={`h-8 w-8 ${
                pageNum === currentPage
                  ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                  : "border-border"
              }`}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
