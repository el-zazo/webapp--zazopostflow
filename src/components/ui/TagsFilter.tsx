"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Check, Tag, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagOption {
  _id: string;
  name: string;
}

interface TagsFilterProps {
  availableTags: TagOption[];
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
}

export function TagsFilter({
  availableTags,
  selectedTagIds,
  onSelectionChange,
}: TagsFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer si click en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Tags filtrés par search
  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle sélection d'un tag
  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <div ref={containerRef} className="relative">

      {/* Trigger - affiche seulement le count */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-md border text-sm transition-colors",
          "bg-background border-input hover:border-orange-500/50",
          "focus:outline-none focus:ring-2 focus:ring-orange-500/20",
          isOpen && "border-orange-500 ring-2 ring-orange-500/20",
          selectedTagIds.length > 0
            ? "text-foreground"
            : "text-muted-foreground"
        )}
      >
        <Tag className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap">
          {selectedTagIds.length > 0
            ? `Tags (${selectedTagIds.length})`
            : "Filter by tags"}
        </span>
        <span className="sm:hidden whitespace-nowrap">
          {selectedTagIds.length > 0
            ? `(${selectedTagIds.length})`
            : "Tags"}
        </span>
        <ChevronDown className={cn(
          "w-3.5 h-3.5 shrink-0 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-xl w-[260px]">

          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Liste tags */}
          <div className="overflow-y-auto max-h-[220px] p-1.5 space-y-0.5">
            {filteredTags.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {search ? "No tags found" : "No tags available"}
              </p>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag._id);
                return (
                  <button
                    key={tag._id}
                    type="button"
                    onClick={() => toggleTag(tag._id)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors text-left",
                      isSelected
                        ? "bg-orange-500/10 text-orange-400"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <span className="truncate min-w-0">{tag.name}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer: clear all */}
          {selectedTagIds.length > 0 && (
            <div className="border-t border-border p-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedTagIds.length} selected
              </span>
              <button
                type="button"
                onClick={() => onSelectionChange([])}
                className="text-xs text-orange-500 hover:text-orange-400 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
