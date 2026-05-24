"use client";

import { Search, X, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const POST_SORT_OPTIONS = [
  { value: "createdAt", label: "Creation Date" },
  { value: "updatedAt", label: "Last Updated" },
  { value: "name", label: "Post Name" },
  { value: "status", label: "Status" },
  { value: "type", label: "Type" },
  { value: "scheduled_date", label: "Scheduled Date" },
  { value: "published_date", label: "Published Date" },
];

interface PostFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  type: string;
  onTypeChange: (value: string) => void;
  media: string;
  onMediaChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: "asc" | "desc";
  onSortOrderToggle: () => void;
  hasActiveFilters?: boolean;
  onReset?: () => void;
}

export function PostFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  type,
  onTypeChange,
  media,
  onMediaChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  hasActiveFilters,
  onReset,
}: PostFiltersProps) {
  return (
    <div className="flex flex-col gap-3 bg-card/20 p-4 border border-border rounded-xl">
      {/* Ligne 1: Search (toujours pleine largeur) */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search posts..."
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
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="h-9 w-full sm:w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="main">Main</SelectItem>
            <SelectItem value="group">Group</SelectItem>
          </SelectContent>
        </Select>

        {/* Media filter */}
        <Select value={media} onValueChange={onMediaChange}>
          <SelectTrigger className="h-9 w-full sm:w-[140px]">
            <SelectValue placeholder="All Media" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Media</SelectItem>
            <SelectItem value="has_images">Has Images</SelectItem>
            <SelectItem value="has_videos">Has Videos</SelectItem>
            <SelectItem value="has_both">Images + Videos</SelectItem>
            <SelectItem value="none">No Media</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Controls */}
        <div className="flex gap-2 flex-1 sm:flex-none">
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-9 flex-1 sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_SORT_OPTIONS.map((opt) => (
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
