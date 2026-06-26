"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Film, Plus, Globe, Calendar, ImageIcon, Video, ExternalLink, Github, ChevronUp, ChevronDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickPublishButton } from "@/components/posts/QuickPublishButton";
import { PostForm } from "@/components/posts/PostForm";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Post, Project } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { apiFetch } from "@/lib/api-client";

interface ShortsProject {
  _id: string;
  name: string;
  tags: Array<{ _id: string; name: string }>;
  github_link: string;
  demo_link: string;
}

interface ShortsPost {
  _id: string;
  name: string;
  content: string;
  type: "main" | "group";
  platform: string;
  status: "draft" | "scheduled" | "published";
  scheduled_date: string | null;
  published_date: string | null;
  has_images: boolean;
  has_videos: boolean;
  createdAt: string;
  updatedAt: string;
  project_id: string;
  project: ShortsProject;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  published: "bg-green-500/20 text-green-400 border-green-500/30",
};

export default function ShortsPage() {
  const [posts, setPosts] = useState<ShortsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // États de pagination
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Edit/Delete state for posts
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Edit/Delete state for projects
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);

  const { toast } = useToast();
  const { isLoading: isUpdatingPost, execute: executeUpdatePost } = useAsyncAction();
  const { isLoading: isDeletingPost, execute: executeDeletePost } = useAsyncAction();
  const { isLoading: isUpdatingProject, execute: executeUpdateProject } = useAsyncAction();
  const { isLoading: isDeletingProject, execute: executeDeleteProject } = useAsyncAction();

  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiFetch("/api/projects?limit=100");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  }, []);

  // Charger le prochain post
  const fetchNextPost = useCallback(async () => {
    if (!hasNextPage || !nextPage || loadingMore) return;

    setLoadingMore(true);
    try {
      const res = await apiFetch(`/api/posts/shorts?page=${nextPage}&limit=1`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setPosts((prev) => [...prev, ...data.data]);
        setNextPage(data.pagination.nextPage);
        setHasNextPage(data.pagination.hasNextPage);
        setTotalItems(data.pagination.totalItems);
      } else {
        setHasNextPage(false);
      }
    } catch (error) {
      console.error("Failed to fetch next shorts post:", error);
    } finally {
      setLoadingMore(false);
      setLoading(false);
    }
  }, [nextPage, hasNextPage, loadingMore]);

  // Charger le tout premier post au montage
  useEffect(() => {
    fetchNextPost();
    fetchProjects();
  }, []);

  // Détecter le défilement pour mettre à jour l'index et précharger
  useEffect(() => {
    const container = containerRef.current;
    if (!container || posts.length === 0) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / viewportHeight);
      
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < posts.length) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [posts.length, currentIndex]);

  // Déclencheur de préchargement
  useEffect(() => {
    if (currentIndex === posts.length - 1 && hasNextPage) {
      fetchNextPost();
    }
  }, [currentIndex, posts.length, hasNextPage, fetchNextPost]);

  const scrollToPost = (index: number) => {
    const section = sectionRefs.current.get(index);
    if (section && containerRef.current) {
      containerRef.current.scrollTo({
        top: index * containerRef.current.clientHeight,
        behavior: "smooth"
      });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      scrollToPost(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < posts.length - 1) {
      scrollToPost(currentIndex + 1);
    } else if (hasNextPage) {
      fetchNextPost();
    }
  };

  // --- Post Edit/Delete handlers ---
  const openEditPost = (shortsPost: ShortsPost) => {
    const post: Post = {
      _id: shortsPost._id,
      project_id: shortsPost.project_id,
      name: shortsPost.name,
      content: shortsPost.content,
      type: shortsPost.type,
      platform: shortsPost.platform,
      status: shortsPost.status,
      scheduled_date: shortsPost.scheduled_date,
      published_date: shortsPost.published_date,
      has_videos: shortsPost.has_videos,
      has_images: shortsPost.has_images,
      createdAt: shortsPost.createdAt,
      updatedAt: shortsPost.updatedAt,
      projectName: shortsPost.project.name,
    };
    setEditingPost(post);
    setPostFormOpen(true);
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
        setPostFormOpen(false);
        // Update locally
        setPosts((prev) =>
          prev.map((p) => {
            if (p._id === editingPost._id) {
              return {
                ...p,
                name: (data.name as string) || p.name,
                content: (data.content as string) || p.content,
                type: (data.type as "main" | "group") || p.type,
                platform: (data.platform as string) || p.platform,
                status: (data.status as "draft" | "scheduled" | "published") || p.status,
                scheduled_date: (data.scheduled_date as string | null) ?? p.scheduled_date,
                published_date: (data.published_date as string | null) ?? p.published_date,
                has_images: (data.has_images as boolean) ?? p.has_images,
                has_videos: (data.has_videos as boolean) ?? p.has_videos,
                project_id: (data.project_id as string) || p.project_id,
              };
            }
            return p;
          })
        );
        // If project changed, fetch full post to get new project info
        if (data.project_id && data.project_id !== editingPost.project_id) {
          try {
            const freshRes = await apiFetch(`/api/posts/shorts?page=1&limit=${posts.length}`);
            const freshData = await freshRes.json();
            if (freshData.success) {
              setPosts(freshData.data);
            }
          } catch {
            // silent fail, local update is still valid
          }
        }
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
        // Remove locally and navigate if needed
        setPosts((prev) => {
          const newPosts = prev.filter((p) => p._id !== id);
          if (currentIndex >= newPosts.length && newPosts.length > 0) {
            setTimeout(() => scrollToPost(newPosts.length - 1), 100);
          }
          return newPosts;
        });
        setTotalItems((prev) => Math.max(0, prev - 1));
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  // --- Project Edit/Delete handlers ---
  const openEditProject = (shortsProject: ShortsProject) => {
    const project: Project = {
      _id: shortsProject._id,
      user_id: "",
      name: shortsProject.name,
      description: "",
      github_link: shortsProject.github_link || "",
      demo_link: shortsProject.demo_link || "",
      tags: shortsProject.tags || [],
      status: "active",
      createdAt: "",
      updatedAt: "",
    };
    setEditingProject(project);
    setProjectFormOpen(true);
  };

  const handleUpdateProject = async (data: Record<string, unknown> & { tags: string[] }) => {
    if (!editingProject) return;

    await executeUpdateProject(async () => {
      const res = await apiFetch(`/api/projects/${editingProject._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        toast({ title: "Project updated successfully!" });
        setEditingProject(null);
        setProjectFormOpen(false);
        // Update locally in all posts that reference this project
        setPosts((prev) =>
          prev.map((p) => {
            if (p.project._id === editingProject._id) {
              return {
                ...p,
                project: {
                  ...p.project,
                  name: (data.name as string) || p.project.name,
                  github_link: (data.github_link as string) || p.project.github_link,
                  demo_link: (data.demo_link as string) || p.project.demo_link,
                  tags: data.tags
                    ? (data.tags as string[]).map((tagId, i) => ({
                        _id: tagId,
                        name: `Tag ${i + 1}`,
                      }))
                    : p.project.tags,
                },
              };
            }
            return p;
          })
        );
        // Fetch fresh data to get updated tags
        try {
          const freshRes = await apiFetch(`/api/projects/${editingProject._id}`);
          const freshData = await freshRes.json();
          if (freshData.success && freshData.data) {
            const updatedProject = freshData.data;
            setPosts((prev) =>
              prev.map((p) => {
                if (p.project._id === editingProject._id) {
                  return {
                    ...p,
                    project: {
                      ...p.project,
                      name: updatedProject.name,
                      github_link: updatedProject.github_link || "",
                      demo_link: updatedProject.demo_link || "",
                      tags: updatedProject.tags || p.project.tags,
                    },
                  };
                }
                return p;
              })
            );
          }
        } catch {
          // silent fail, local update is still valid
        }
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleDeleteProject = async () => {
    if (!editingProject) return;

    await executeDeleteProject(async () => {
      const res = await apiFetch(`/api/projects/${editingProject._id}`, { method: "DELETE" });
      const result = await res.json();

      if (result.success) {
        toast({ title: "Project deleted successfully!" });
        setProjectFormOpen(false);
        setEditingProject(null);
        // Remove all posts that belong to this project
        setPosts((prev) => {
          const newPosts = prev.filter((p) => p.project._id !== editingProject._id);
          if (currentIndex >= newPosts.length && newPosts.length > 0) {
            setTimeout(() => scrollToPost(0), 100);
          }
          return newPosts;
        });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  // Premier chargement squelette
  if (loading && posts.length === 0) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl px-4">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-[55vh] rounded-xl" />
        </div>
      </div>
    );
  }

  // Aucun post existant
  if (posts.length === 0) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <Film className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">No posts yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create your first post in a project to start browsing in Shorts view.
          </p>
          <Button
            asChild
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Link href="/projects">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Post
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-8.5rem)] md:h-[calc(100vh-5.5rem)] overflow-hidden">
      
      {/* Contrôles Desktop à droite */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-2 bg-card/40 backdrop-blur-xs p-2 rounded-full border border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-foreground hover:bg-orange-500/10 hover:text-orange-500"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          title="Previous post"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        
        <div className="text-center text-[10px] font-bold text-muted-foreground py-0.5">
          {currentIndex + 1}/{totalItems}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-foreground hover:bg-orange-500/10 hover:text-orange-500"
          onClick={goToNext}
          disabled={currentIndex === posts.length - 1 && !hasNextPage}
          title="Next post"
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      </div>

      {/* Conteneur principal Snappable parfait */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {posts.map((post, index) => (
          <div
            key={post._id}
            ref={(el) => {
              if (el) sectionRefs.current.set(index, el);
              else sectionRefs.current.delete(index);
            }}
            className="h-full w-full snap-start flex flex-col overflow-hidden shrink-0"
            style={{ scrollSnapAlign: "start" }}
          >
            {/* 1. Carte de l'en-tête du projet */}
            <div className="bg-card border-b border-border p-4 shrink-0">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/projects/${post.project._id}`}
                      className="text-sm font-bold text-foreground hover:text-orange-500 transition-colors truncate block"
                      title={post.project.name}
                    >
                      {post.project.name}
                    </Link>
                    {post.project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {post.project.tags.slice(0, 4).map((tag) => (
                          <Badge
                            key={tag._id}
                            variant="outline"
                            className="border-orange-500/30 text-orange-400 text-[10px] px-1.5 py-0 max-w-[110px] truncate"
                            title={tag.name}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {post.project.tags.length > 4 && (
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            +{post.project.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {post.project.github_link && (
                      <a
                        href={post.project.github_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
                        title="GitHub"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {post.project.demo_link && (
                      <a
                        href={post.project.demo_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
                        title="Demo"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {/* Project Edit button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditProject(post.project)}
                      title="Edit project"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {/* Project Delete button */}
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      }
                      title="Delete Project"
                      description={`Are you sure you want to delete "${post.project.name}"? All posts in this project will also be deleted. This action cannot be undone.`}
                      onConfirm={handleDeleteProject}
                      confirmText="Delete"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Zone de contenu centrale scrollable */}
            <div className="flex-1 overflow-y-auto p-4 bg-background">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-foreground truncate pt-1" title={post.name}>
                    {post.name}
                  </h2>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Post Edit button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditPost(post)}
                      title="Edit post"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {/* Post Delete button */}
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      }
                      title="Delete Post"
                      description={`Are you sure you want to delete "${post.name}"? This action cannot be undone.`}
                      onConfirm={() => handleDeletePost(post._id)}
                      confirmText="Delete"
                    />
                  </div>
                </div>

                {/* Visualiseur de contenu */}
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <pre className="whitespace-pre-wrap break-words text-sm text-foreground font-mono leading-relaxed max-h-[35vh] overflow-y-auto pr-2">
                    {post.content}
                  </pre>
                </div>

                {/* Métadonnées + Actionneur de publication */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="outline" className={statusColors[post.status]}>
                    {post.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      post.type === "main"
                        ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    }
                  >
                    {post.type === "main" ? "Main" : "Group"}
                  </Badge>
                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                    <Globe className="w-3.5 h-3.5 mr-1" />
                    {post.platform}
                  </Badge>

                  {/* Médias */}
                  {post.has_images && (
                    <span title="Contains Images" className="flex items-center text-xs text-blue-400 gap-1 ml-1">
                      <ImageIcon className="w-4 h-4" />
                    </span>
                  )}
                  {post.has_videos && (
                    <span title="Contains Videos" className="flex items-center text-xs text-purple-400 gap-1">
                      <Video className="w-4 h-4" />
                    </span>
                  )}

                  <div className="flex-1" />

                  {/* Bouton Toggle Premium */}
                  <QuickPublishButton
                    post={{
                      _id: post._id,
                      project_id: post.project_id,
                      name: post.name,
                      content: post.content,
                      type: post.type,
                      platform: post.platform,
                      status: post.status,
                      scheduled_date: post.scheduled_date,
                      published_date: post.published_date,
                      has_images: post.has_images,
                      has_videos: post.has_videos,
                      createdAt: post.createdAt,
                      updatedAt: post.updatedAt,
                      projectName: post.project.name,
                    }}
                    onSuccess={() => {
                      setPosts((prev) =>
                        prev.map((p) => {
                          if (p._id === post._id) {
                            const newStatus = p.status === "published" 
                              ? (p.scheduled_date ? "scheduled" : "draft") 
                              : "published";
                            return { ...p, status: newStatus };
                          }
                          return p;
                        })
                      );
                    }}
                  />
                </div>

                {/* Dates */}
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground border-t border-border/60 pt-3">
                  {post.scheduled_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>
                        Scheduled: {new Date(post.scheduled_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {post.published_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      <span>
                        Published: {new Date(post.published_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="text-muted-foreground/60 pl-5.5">
                    Created: {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Petit spinner discret en bas pour le préchargement infini */}
        {loadingMore && (
          <div className="h-12 flex items-center justify-center bg-background border-t border-border/20">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          </div>
        )}
      </div>

      {/* Compteur mobile du bas */}
      <div className="md:hidden fixed bottom-20 right-4 z-20 bg-card/85 backdrop-blur-xs rounded-full px-3 py-1 text-xs text-muted-foreground border border-border shadow-md">
        {currentIndex + 1}/{totalItems}
      </div>

      {/* Post Form Dialog */}
      <PostForm
        open={postFormOpen}
        onClose={() => {
          setPostFormOpen(false);
          setEditingPost(null);
        }}
        onSubmit={handleUpdatePost}
        post={editingPost}
        projects={projects}
        defaultProjectId={editingPost?.project_id}
      />

      {/* Project Form Dialog */}
      <ProjectForm
        open={projectFormOpen}
        onClose={() => {
          setProjectFormOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleUpdateProject}
        project={editingProject}
      />
    </div>
  );
}
