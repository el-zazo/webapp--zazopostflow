"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";

const PROJECT_SORT_OPTIONS = [
  { value: "createdAt", label: "Creation Date" },
  { value: "updatedAt", label: "Last Updated" },
  { value: "name", label: "Project Name" },
  { value: "postsCount", label: "Posts Count" },
  { value: "status", label: "Status" },
  { value: "tagsCount", label: "Tags Count" },
];

interface ProjectFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: "asc" | "desc";
  onSortOrderToggle: () => void;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  children?: React.ReactNode;
}

export function ProjectFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  hasActiveFilters,
  onReset,
  children,
}: ProjectFiltersProps) {
  return (
    <div className="flex flex-col gap-3 bg-card/20 p-4 border border-border rounded-xl">
      {/* Ligne 1: Search (toujours pleine largeur) */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          className="pl-9 h-9 w-full"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Ligne 2: Filters + Sort + Reset (wrap sur mobile) */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Status filter */}
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-9 w-full sm:w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Extra filters (e.g. TagsFilter) */}
        {children}

        {/* Sort Controls */}
        <div className="flex gap-2 flex-1 sm:flex-none">
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-9 flex-1 sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_SORT_OPTIONS.map((opt) => (
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
            className="h-9 w-9 shrink-0"
            onClick={onSortOrderToggle}
            title={sortOrder === "desc" ? "Descending" : "Ascending"}
          >
            {sortOrder === "desc"
              ? <ArrowDownWideNarrow className="w-4 h-4" />
              : <ArrowUpNarrowWide className="w-4 h-4" />
            }
          </Button>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && onReset && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
            onClick={onReset}
            title="Reset all filters"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export { PROJECT_SORT_OPTIONS };
