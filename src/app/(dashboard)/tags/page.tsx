"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Tags, Search, Trash2, X, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PremiumPagination } from "@/components/shared/PremiumPagination";
import { EditTagDialog } from "@/components/tags/EditTagDialog";
import { Tag } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/api-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const TAG_SORT_OPTIONS = [
  { value: "createdAt", label: "Creation Date" },
  { value: "updatedAt", label: "Last Updated" },
  { value: "name", label: "Tag Name" },
  { value: "projectsCount", label: "Projects Count" },
];

const tagCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be at most 50 characters"),
});

type TagFormValues = z.infer<typeof tagCreateSchema>;

export default function TagsPage() {
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // [FIX #9] Abort controller pour annuler les requêtes obsolètes
  const abortControllerRef = useRef<AbortController | null>(null);

  // hasActiveFilters + Reset
  const hasActiveFilters =
    search !== "" ||
    filter !== "all" ||
    sortBy !== "createdAt" ||
    sortOrder !== "desc";

  const handleReset = () => {
    setSearch("");
    setFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const createForm = useForm<TagFormValues>({
    resolver: zodResolver(tagCreateSchema),
    defaultValues: { name: "" },
  });

  const fetchTags = useCallback(async (currentPage: number, signal: AbortSignal) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("filter", filter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", currentPage.toString());
      params.set("limit", limit.toString());

      const res = await apiFetch(`/api/tags?${params.toString()}`, { signal });
      const data = await res.json();

      if (signal.aborted) return;

      if (data.success) {
        setTags(data.data);
        setTotalItems(data.pagination.totalItems);
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Failed to fetch tags:", error);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [search, filter, sortBy, sortOrder, limit]);

  // [FIX #9] Effet unique pour fetch tags avec annulation des requêtes obsolètes
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    fetchTags(page, controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchTags, page]);

  // [FIX #9] Réinitialiser la page quand les FILTRES changent
  const filterDeps = [search, filter, sortBy, sortOrder];
  const prevFilterDepsRef = useRef(filterDeps);
  useEffect(() => {
    const changed = filterDeps.some(
      (dep, i) => dep !== prevFilterDepsRef.current[i]
    );
    if (changed) {
      setPage(1);
    }
    prevFilterDepsRef.current = filterDeps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, sortBy, sortOrder]);

  const { isLoading: isCreating, execute: executeCreate } = useAsyncAction();
  const { isLoading: isDeleting, execute: executeDelete } = useAsyncAction();

  const handleCreateTag = async (data: TagFormValues) => {
    await executeCreate(async () => {
      const res = await apiFetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        toast({ title: "Tag created successfully!" });
        setCreateOpen(false);
        createForm.reset({ name: "" });
        fetchTags(page, abortControllerRef.current?.signal ?? new AbortController().signal);
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleDeleteTag = async (id: string) => {
    await executeDelete(async () => {
      const res = await apiFetch(`/api/tags/${id}`, { method: "DELETE" });
      const result = await res.json();

      if (result.success) {
        toast({ title: "Tag deleted successfully!" });
        fetchTags(page, abortControllerRef.current?.signal ?? new AbortController().signal);
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tags</h2>
          <p className="text-sm text-muted-foreground">
            Manage your tech tags and organize projects
          </p>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white"
          onClick={() => {
            createForm.reset({ name: "" });
            setCreateOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">New Tag</span>
        </Button>
      </div>

      {/* Filters - Responsive Pattern */}
      <div className="flex flex-col gap-3 bg-card/20 p-4 border border-border rounded-xl">
        {/* Ligne 1: Search (toujours pleine largeur) */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            className="pl-9 h-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Ligne 2: Filters + Sort + Reset (wrap sur mobile) */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Used/Unused filter */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="unused">Unused</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Controls */}
          <div className="flex gap-2 flex-1 sm:flex-none">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 flex-1 sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAG_SORT_OPTIONS.map((opt) => (
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
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              title={sortOrder === "desc" ? "Descending" : "Ascending"}
            >
              {sortOrder === "desc"
                ? <ArrowDownWideNarrow className="w-4 h-4" />
                : <ArrowUpNarrowWide className="w-4 h-4" />
              }
            </Button>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
              onClick={handleReset}
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-16">
          <Tags className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No tags yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create tags to categorize and filter your projects by technology.
          </p>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => {
              createForm.reset({ name: "" });
              setCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Tag
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table className="min-w-[400px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Tag Name</TableHead>
                  <TableHead className="text-muted-foreground text-center">Projects</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow
                    key={tag._id}
                    className="border-border hover:bg-accent/50 transition-colors"
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-orange-500/30 bg-orange-500/5 text-orange-400 font-medium"
                      >
                        {tag.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">
                        {tag.projectsCount ?? 0} project{(tag.projectsCount ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Button */}
                        <EditTagDialog
                          tag={tag}
                          onSuccess={(updatedTag) => {
                            setTags(prev =>
                              prev.map(t => t._id === updatedTag._id ? { ...t, ...updatedTag } : t)
                            );
                          }}
                        />
                        {/* Delete Button */}
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Delete tag"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          }
                          title="Delete Tag"
                          description={`Are you sure you want to delete "${tag.name}"? It will be removed from all projects that use it. This action cannot be undone.`}
                          onConfirm={() => handleDeleteTag(tag._id)}
                          confirmText="Delete"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <PremiumPagination
            totalItems={totalItems}
            currentPage={page}
            itemsPerPage={limit}
            currentItemsCount={tags.length}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </>
      )}

      {/* Create Tag Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Tag</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateTag)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. React, Node.js, TypeScript..."
                        className="bg-background border-border"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  className="border-border w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Tag"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
