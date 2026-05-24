"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SortOption {
  value: string;
  label: string;
}

interface SortControlsProps {
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: "asc" | "desc";
  onSortOrderToggle: () => void;
  options: SortOption[];
}

export function SortControls({
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  options,
}: SortControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-full sm:w-[180px] bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Toggle ASC/DESC */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 border-border"
        onClick={onSortOrderToggle}
        title={
          sortOrder === "desc"
            ? "Descending → Click for Ascending"
            : "Ascending → Click for Descending"
        }
      >
        {sortOrder === "desc" ? (
          <ArrowDownWideNarrow className="w-4 h-4" />
        ) : (
          <ArrowUpNarrowWide className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
