"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  ExternalLink,
  Github,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/posts/PostCard";
import { PostForm } from "@/components/posts/PostForm";
import { PostFilters } from "@/components/posts/PostFilters";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PremiumPagination } from "@/components/shared/PremiumPagination";
import { Project, Post } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { FileText } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

export default function ProjectPostsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // [FIX #9] Abort controller pour annuler les requêtes obsolètes
  const abortControllerRef = useRef<AbortController | null>(null);

  const { isLoading: isUpdatingProject, execute: executeUpdateProject } = useAsyncAction();
  const { isLoading: isDeletingProject, execute: executeDeleteProject } = useAsyncAction();
  const { isLoading: isCreatingPost, execute: executeCreatePost } = useAsyncAction();
  const { isLoading: isUpdatingPost, execute: executeUpdatePost } = useAsyncAction();
  const { isLoading: isDeletingPost, execute: executeDeletePost } = useAsyncAction();

  const fetchProject = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.data);
      } else {
        toast({ title: "Error", description: "Project not found", variant: "destructive" });
        router.push("/projects");
      }
    } catch {
      toast({ title: "Error", description: "Failed to load project", variant: "destructive" });
    }
  }, [projectId, router, toast]);

  const fetchPosts = useCallback(async (currentPage: number, signal: AbortSignal) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("projectId", projectId);
      if (statusFilter !== "all") queryParams.set("status", statusFilter);
      if (typeFilter !== "all") queryParams.set("type", typeFilter);
      if (mediaFilter !== "all") queryParams.set("mediaFilter", mediaFilter);
      if (search.trim()) queryParams.set("search", search.trim());
      queryParams.set("sortBy", sortBy);
      queryParams.set("sortOrder", sortOrder);
      queryParams.set("page", currentPage.toString());
      queryParams.set("limit", limit.toString());

      const res = await apiFetch(`/api/posts?${queryParams.toString()}`, { signal });
      const data = await res.json();

      if (signal.aborted) return;

      if (data.success) {
        setPosts(data.data);
        setTotalItems(data.pagination.totalItems);
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Failed to fetch posts:", error);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [projectId, statusFilter, typeFilter, mediaFilter, search, sortBy, sortOrder, limit]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // [FIX #9] Effet unique pour fetch posts avec annulation des requêtes obsolètes
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    fetchPosts(page, controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchPosts, page]);

  // [FIX #9] Réinitialiser la page quand les FILTRES changent (pas la page)
  const filterDeps = [search, statusFilter, typeFilter, mediaFilter, sortBy, sortOrder];
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
  }, [search, statusFilter, typeFilter, mediaFilter, sortBy, sortOrder]);

  // hasActiveFilters + Reset
  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    mediaFilter !== "all" ||
    sortBy !== "createdAt" ||
    sortOrder !== "desc";

  const handleReset = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setMediaFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const handleSortOrderToggle = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const handleUpdateProject = async (data: Record<string, unknown> & { tags: string[] }) => {
    await executeUpdateProject(async () => {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        toast({ title: "Project updated successfully!" });
        setProjectFormOpen(false);
        fetchProject();
        fetchPosts(page, abortControllerRef.current?.signal ?? new AbortController().signal);
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleDeleteProject = async () => {
    await executeDeleteProject(async () => {
      const res = await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const result = await res.json();

      if (result.success) {
        toast({ title: "Project deleted successfully!" });
        router.push("/projects");
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleCreatePost = async (data: Record<string, unknown>) => {
    await executeCreatePost(async () => {
      const res = await apiFetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        toast({ title: "Post created successfully!" });
        setFormOpen(false);
        fetchPosts(page, abortControllerRef.current?.signal ?? new AbortController().signal);
        fetchProject();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleUpdatePost = async (data: Record<string, unknown>) => {
    if (!editingPost) return;

    await executeUpdatePost(async () => {
      const res = await apiFetch(`/api/posts/${editingPost._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        toast({ title: "Post updated successfully!" });
        setEditingPost(null);
        setFormOpen(false);
        fetchPosts(page, abortControllerRef.current?.signal ?? new AbortController().signal);
        fetchProject();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleDeletePost = async (id: string) => {
    await executeDeletePost(async () => {
      const res = await apiFetch(`/api/posts/${id}`, { method: "DELETE" });
      const result = await res.json();

      if (result.success) {
        toast({ title: "Post deleted successfully!" });
        fetchPosts(page, abortControllerRef.current?.signal ?? new AbortController().signal);
        fetchProject();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  if (loading || !project) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      {/* Project Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-foreground">
                {project.name}
              </h2>
              <Badge
                variant={project.status === "active" ? "default" : "secondary"}
                className={
                  project.status === "active"
                    ? "bg-green-500/10 text-green-500 shrink-0"
                    : "shrink-0"
                }
              >
                {project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line break-words leading-relaxed">{project.description}</p>
            )}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {project.tags.map((tag) => (
                  <Badge
                    key={tag._id}
                    variant="outline"
                    className="border-orange-500/30 text-orange-400"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              {project.github_link && (
                <a
                  href={project.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              )}
              {project.demo_link && (
                <a
                  href={project.demo_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Demo
                </a>
              )}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FolderOpen className="w-4 h-4" />
                {project.postsCount || 0} posts
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto"
              onClick={() => {
                setEditingPost(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline ml-2">New Post</span>
            </Button>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="border-border h-9 w-9 md:h-8 md:w-8"
                onClick={() => setProjectFormOpen(true)}
                title="Edit project"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="outline" size="icon" className="border-border text-destructive hover:text-destructive h-9 w-9 md:h-8 md:w-8" title="Delete project">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                }
                title="Delete Project"
                description={`Are you sure you want to delete "${project.name}"? All posts in this project will also be deleted. This action cannot be undone.`}
                onConfirm={handleDeleteProject}
                confirmText="Delete"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <PostFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        type={typeFilter}
        onTypeChange={setTypeFilter}
        media={mediaFilter}
        onMediaChange={setMediaFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderToggle={handleSortOrderToggle}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
      />

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {search || statusFilter !== "all" || typeFilter !== "all"
              ? "No posts match your filters"
              : "No posts yet"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {search || statusFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Create your first LinkedIn post for this project."}
          </p>
          {(!search && statusFilter === "all" && typeFilter === "all") && (
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => {
                setEditingPost(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Post
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div key={post._id} className="min-w-0 overflow-hidden">
                <PostCard
                  post={post}
                  onEdit={(post) => {
                    setEditingPost(post);
                    setFormOpen(true);
                  }}
                  onDelete={handleDeletePost}
                />
              </div>
            ))}
          </div>

          <PremiumPagination
            totalItems={totalItems}
            currentPage={page}
            itemsPerPage={limit}
            currentItemsCount={posts.length}
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
        open={projectFormOpen}
        onClose={() => setProjectFormOpen(false)}
        onSubmit={handleUpdateProject}
        project={project}
      />

      {/* Post Form Dialog */}
      <PostForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPost(null);
        }}
        onSubmit={editingPost ? handleUpdatePost : handleCreatePost}
        post={editingPost}
        projects={project ? [project] : []}
        defaultProjectId={projectId}
      />
    </div>
  );
}
