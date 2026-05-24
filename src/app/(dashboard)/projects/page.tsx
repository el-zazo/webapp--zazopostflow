"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectFilters, PROJECT_SORT_OPTIONS } from "@/components/projects/ProjectFilters";
import { PremiumPagination } from "@/components/shared/PremiumPagination";
import { TagsFilter } from "@/components/ui/TagsFilter";
import { Project } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { FolderKanban } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

export default function ProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Tags filter
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<{_id: string; name: string}[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch tags au mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await apiFetch("/api/tags?limit=100");
        const data = await res.json();
        if (data.success) {
          setAvailableTags(data.data.map((t: any) => ({
            _id: t._id,
            name: t.name,
          })));
        }
      } catch {}
    };
    fetchTags();
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      // ← Ajouter filtre tags
      if (selectedTagIds.length > 0) {
        params.set("tags", selectedTagIds.join(","));
      }

      const res = await apiFetch(`/api/projects?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setProjects(data.data);
        setTotalItems(data.pagination.totalItems);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }, [search, status, sortBy, sortOrder, page, limit, selectedTagIds]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, status, sortBy, sortOrder, selectedTagIds]);

  // hasActiveFilters + Reset
  const hasActiveFilters =
    search !== "" ||
    status !== "all" ||
    sortBy !== "createdAt" ||
    sortOrder !== "desc" ||
    selectedTagIds.length > 0;

  const handleReset = () => {
    setSearch("");
    setStatus("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setSelectedTagIds([]);
    setPage(1);
  };

  const { isLoading: isCreating, execute: executeCreate } = useAsyncAction();
  const { isLoading: isUpdating, execute: executeUpdate } = useAsyncAction();
  const { isLoading: isDeleting, execute: executeDelete } = useAsyncAction();

  const handleCreateProject = async (
    data: Record<string, unknown> & { tags: string[] }
  ) => {
    await executeCreate(async () => {
      const res = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        toast({ title: "Project created successfully!" });
        setFormOpen(false);
        fetchProjects();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleUpdateProject = async (
    data: Record<string, unknown> & { tags: string[] }
  ) => {
    if (!editingProject) return;

    await executeUpdate(async () => {
      const res = await apiFetch(`/api/projects/${editingProject._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        toast({ title: "Project updated successfully!" });
        setEditingProject(null);
        setFormOpen(false);
        fetchProjects();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleDeleteProject = async (id: string) => {
    await executeDelete(async () => {
      const res = await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
      const result = await res.json();

      if (result.success) {
        toast({ title: "Project deleted successfully!" });
        fetchProjects();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Projects</h2>
          <p className="text-sm text-muted-foreground">
            Manage your projects and their LinkedIn posts
          </p>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white"
          onClick={() => {
            setEditingProject(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">New Project</span>
        </Button>
      </div>

      {/* Filters */}
      <ProjectFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderToggle={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
      >
        {/* Tags filter */}
        <TagsFilter
          availableTags={availableTags}
          selectedTagIds={selectedTagIds}
          onSelectionChange={setSelectedTagIds}
        />
      </ProjectFilters>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No projects yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first project to start organizing your LinkedIn posts
            around your development work.
          </p>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => {
              setEditingProject(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Project
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project._id} className="min-w-0 overflow-hidden">
                <ProjectCard
                  project={project}
                  onEdit={handleEdit}
                  onDelete={handleDeleteProject}
                />
              </div>
            ))}
          </div>

          <PremiumPagination
            totalItems={totalItems}
            currentPage={page}
            itemsPerPage={limit}
            currentItemsCount={projects.length}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </>
      )}

      {/* Project Form Dialog */}
      <ProjectForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProject(null);
        }}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        project={editingProject}
      />
    </div>
  );
}
