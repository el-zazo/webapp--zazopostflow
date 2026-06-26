"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FolderKanban, FileText, CalendarCheck, Send, Plus, ImageIcon, Video, Clock, AlertTriangle, PartyPopper, PenTool, Pencil, Trash2 } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardStats, RecentPost, Project, Post } from "@/types";
import { PostForm } from "@/components/posts/PostForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { apiFetch } from "@/lib/api-client";

const DEFAULT_STATS: DashboardStats = {
  totalProjects: 0,
  totalPosts: 0,
  scheduledThisWeek: 0,
  publishedThisMonth: 0,
};

interface UpcomingPost {
  _id: string;
  name: string;
  status: string;
  scheduled_date: string | null;
  projectName: string;
  projectId: string;
}

interface MissedPost {
  _id: string;
  name: string;
  status: string;
  scheduled_date: string | null;
  projectName: string;
  projectId: string;
}

interface DraftPost {
  _id: string;
  name: string;
  status: string;
  updatedAt: string;
  projectName: string;
  projectId: string;
}

interface TopTag {
  _id: string;
  name: string;
  projectsCount: number;
}

interface DashboardResponse {
  success: boolean;
  data?: {
    stats?: Partial<DashboardStats>;
    recentPosts?: RecentPost[];
    upcomingPosts?: UpcomingPost[];
    missedPosts?: MissedPost[];
    draftPosts?: DraftPost[];
    totalDraftsCount?: number;
  };
}

function getCountdown(targetDate: string): string {
  const now = new Date();
  const target = new Date(targetDate);

  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffMs = targetMidnight.getTime() - nowMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "overdue";
  }
  
  if (diffDays === 0) {
    const exactDiffMs = target.getTime() - now.getTime();
    if (exactDiffMs <= 0) {
      return "today";
    }
    
    const diffMinutes = Math.floor(exactDiffMs / (1000 * 60));
    const diffHours = Math.floor(exactDiffMs / (1000 * 60 * 60));
    
    if (diffHours === 0) {
      return `today (in ${diffMinutes} min)`;
    }
    return `today (in ${diffHours}h)`;
  }
  
  if (diffDays === 1) {
    return "tomorrow";
  }
  
  return `in ${diffDays} days`;
}

function getDaysOverdue(scheduledDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const scheduled = new Date(scheduledDate);
  scheduled.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - scheduled.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<UpcomingPost[]>([]);
  const [missedPosts, setMissedPosts] = useState<MissedPost[]>([]);
  const [draftPosts, setDraftPosts] = useState<DraftPost[]>([]);
  const [totalDraftsCount, setTotalDraftsCount] = useState<number>(0);
  const [topTags, setTopTags] = useState<TopTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Edit/Delete state
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const { toast } = useToast();
  const { isLoading: isUpdatingPost, execute: executeUpdatePost } = useAsyncAction();
  const { isLoading: isDeletingPost, execute: executeDeletePost } = useAsyncAction();

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);

      const [dashRes, tagsRes] = await Promise.all([
        apiFetch("/api/dashboard"),
        apiFetch("/api/dashboard/top-tags"),
      ]);

      if (!dashRes.ok) {
        console.error("Dashboard API error:", dashRes.status);
        setFetchError(true);
        setStats(DEFAULT_STATS);
        setRecentPosts([]);
        setUpcomingPosts([]);
        setMissedPosts([]);
        setDraftPosts([]);
        setTotalDraftsCount(0);
      } else {
        const data = (await dashRes.json()) as DashboardResponse;

        if (data && data.success && data.data) {
          if (data.data.stats) {
            setStats({
              totalProjects: Number(data.data.stats.totalProjects) || 0,
              totalPosts: Number(data.data.stats.totalPosts) || 0,
              scheduledThisWeek: Number(data.data.stats.scheduledThisWeek) || 0,
              publishedThisMonth: Number(data.data.stats.publishedThisMonth) || 0,
            });
          } else {
            setStats(DEFAULT_STATS);
          }

          if (Array.isArray(data.data.recentPosts)) {
            setRecentPosts(data.data.recentPosts);
          } else {
            setRecentPosts([]);
          }

          if (Array.isArray(data.data.upcomingPosts)) {
            setUpcomingPosts(data.data.upcomingPosts);
          } else {
            setUpcomingPosts([]);
          }

          if (Array.isArray(data.data.missedPosts)) {
            setMissedPosts(data.data.missedPosts);
          } else {
            setMissedPosts([]);
          }

          if (Array.isArray(data.data.draftPosts)) {
            setDraftPosts(data.data.draftPosts);
          } else {
            setDraftPosts([]);
          }
          setTotalDraftsCount(data.data.totalDraftsCount || 0);
        } else {
          setFetchError(true);
          setStats(DEFAULT_STATS);
          setRecentPosts([]);
          setUpcomingPosts([]);
          setMissedPosts([]);
          setDraftPosts([]);
          setTotalDraftsCount(0);
        }
      }

      if (tagsRes.ok) {
        const tagsData = (await tagsRes.json()) as { success: boolean; data: TopTag[] };
        if (tagsData.success && Array.isArray(tagsData.data)) {
          setTopTags(tagsData.data);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setFetchError(true);
      setStats(DEFAULT_STATS);
      setRecentPosts([]);
      setUpcomingPosts([]);
      setMissedPosts([]);
      setDraftPosts([]);
      setTotalDraftsCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchDashboard();
    fetchProjects();
  }, [fetchDashboard, fetchProjects]);

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
        fetchDashboard();
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
        fetchDashboard();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const openEditPost = async (postId: string) => {
    try {
      const res = await apiFetch(`/api/posts/${postId}`);
      const data = await res.json();
      if (data.success) {
        setEditingPost(data.data);
        setFormOpen(true);
      } else {
        toast({ title: "Error", description: "Failed to load post details", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to load post details", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const hasNoProjects = stats.totalProjects === 0;
  const hasNoPosts = stats.totalPosts === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s an overview of your activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Projects"
          value={stats.totalProjects}
          icon={FolderKanban}
          description="All your projects"
        />
        <StatsCard
          title="Total Posts"
          value={stats.totalPosts}
          icon={FileText}
          description="Across all projects"
        />
        <StatsCard
          title="Scheduled This Week"
          value={stats.scheduledThisWeek}
          icon={CalendarCheck}
          description="Posts to publish"
        />
        <StatsCard
          title="Published This Month"
          value={stats.publishedThisMonth}
          icon={Send}
          description="Posts live on LinkedIn"
        />
      </div>

      {/* Top Technologies Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Top Technologies</CardTitle>
        </CardHeader>
        <CardContent>
          {topTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasNoProjects
                ? "Create a project and add tags to see your top technologies."
                : "No tags assigned yet. Add tags to your projects to track technologies."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topTags.map((tag) => (
                <Badge
                  key={tag._id}
                  variant="outline"
                  className="border-orange-500/30"
                >
                  {tag.name} ({tag.projectsCount})
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Posts to Publish Soon (Upcoming) */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <CardTitle className="text-foreground">Posts to Publish Soon</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingPosts.length === 0 ? (
            <div className="text-center py-6">
              <PartyPopper className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-foreground font-medium">All caught up!</p>
              <p className="text-muted-foreground text-sm">
                No upcoming scheduled posts.
              </p>
            </div>
          ) : (
            <div>
              {upcomingPosts.map((post) => (
                <div
                  key={post._id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate min-w-0">
                      {post.name || "Untitled Post"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 min-w-0">
                      <Link
                        href={`/projects/${post.projectId}`}
                        className="hover:text-orange-500 transition-colors underline-offset-2 hover:underline"
                      >
                        {post.projectName || "Unknown Project"}
                      </Link>
                      {post.scheduled_date && (
                        <>
                          {" "}&middot;{" "}
                          {new Date(post.scheduled_date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {post.scheduled_date && (
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs"
                      >
                        {getCountdown(post.scheduled_date)}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => openEditPost(post._id)}
                      title="Edit post"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      }
                      title="Delete Post"
                      description={`Are you sure you want to delete "${post.name || "Untitled Post"}"? This action cannot be undone.`}
                      onConfirm={() => handleDeletePost(post._id)}
                      confirmText="Delete"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missed Scheduled Posts */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <CardTitle className="text-foreground">Missed Scheduled Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {missedPosts.length === 0 ? (
            <div className="text-center py-6">
              <CalendarCheck className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-foreground font-medium">No missed posts</p>
              <p className="text-muted-foreground text-sm">
                All your scheduled posts have been published on time.
              </p>
            </div>
          ) : (
            <div>
              {missedPosts.map((post) => (
                <div
                  key={post._id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate min-w-0">
                      {post.name || "Untitled Post"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 min-w-0">
                      <Link
                        href={`/projects/${post.projectId}`}
                        className="hover:text-orange-500 transition-colors underline-offset-2 hover:underline"
                      >
                        {post.projectName || "Unknown Project"}
                      </Link>
                      {post.scheduled_date && (
                        <>
                          {" "}&middot;{" "}
                          Was due:{" "}
                          {new Date(post.scheduled_date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className="bg-red-500/10 text-red-500 border-red-500/20 text-xs"
                    >
                      {post.scheduled_date
                        ? `${getDaysOverdue(post.scheduled_date)} day${getDaysOverdue(post.scheduled_date) !== 1 ? "s" : ""} overdue`
                        : "Overdue"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => openEditPost(post._id)}
                      title="Edit post"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      }
                      title="Delete Post"
                      description={`Are you sure you want to delete "${post.name || "Untitled Post"}"? This action cannot be undone.`}
                      onConfirm={() => handleDeletePost(post._id)}
                      confirmText="Delete"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Posts Section */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center gap-2">
          <PenTool className="w-5 h-5 text-gray-400" />
          <CardTitle className="text-foreground">Draft Posts (Brouillons)</CardTitle>
        </CardHeader>
        <CardContent>
          {draftPosts.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-foreground font-medium">No drafts found</p>
              <p className="text-muted-foreground text-sm">
                All your post ideas are scheduled or published!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                {draftPosts.map((post) => (
                  <div
                    key={post._id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate min-w-0">
                        {post.name || "Untitled Post"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 min-w-0">
                        <Link
                          href={`/projects/${post.projectId}`}
                          className="hover:text-orange-500 transition-colors underline-offset-2 hover:underline"
                        >
                          {post.projectName || "Unknown Project"}
                        </Link>
                        {" "}&middot;{" "}
                        Last edited:{" "}
                        {new Date(post.updatedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditPost(post._id)}
                        title="Edit post"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
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
                        description={`Are you sure you want to delete "${post.name || "Untitled Post"}"? This action cannot be undone.`}
                        onConfirm={() => handleDeletePost(post._id)}
                        confirmText="Delete"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Compteur de reste s'il y a plus de 5 brouillons */}
              {totalDraftsCount > 5 && (
                <div className="text-center pt-2.5 border-t border-border">
                  <p className="text-xs text-muted-foreground font-medium">
                    + {totalDraftsCount - 5} more draft post{totalDraftsCount - 5 !== 1 ? "s" : ""} waiting in your projects.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {fetchError ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">
                Unable to load recent activity
              </p>
              <p className="text-muted-foreground text-sm">
                There was a problem fetching your data. Please try refreshing the page.
              </p>
            </div>
          ) : hasNoProjects ? (
            <div className="text-center py-8">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">
                No projects yet
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first project to start organizing your LinkedIn posts.
              </p>
              <Button
                asChild
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Link href="/projects">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Project
                </Link>
              </Button>
            </div>
          ) : hasNoPosts ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">
                No posts yet
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                You have projects but no posts. Start writing your first LinkedIn post!
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
          ) : recentPosts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No recent activity to display.
              </p>
            </div>
          ) : (
            <div>
              {recentPosts.map((post) => (
                <div
                  key={post._id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate min-w-0">
                      {post.name || "Untitled Post"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 min-w-0">
                      <Link
                        href={`/projects/${post.projectId}`}
                        className="hover:text-orange-500 transition-colors underline-offset-2 hover:underline"
                      >
                        {post.projectName || "Unknown Project"}
                      </Link>{" "}&middot;{" "}
                      {post.createdAt
                        ? new Date(post.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Unknown date"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {post.type && (
                        <span
                          className={`
                            text-xs px-1.5 py-0.5 rounded font-medium
                            ${post.type === "main"
                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }
                          `}
                        >
                          {post.type === "main" ? "Main" : "Group"}
                        </span>
                      )}
                      {post.has_images && (
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                          <ImageIcon className="w-3 h-3 shrink-0" />
                          <span className="hidden sm:inline">Images</span>
                        </div>
                      )}
                      {post.has_videos && (
                        <div className="flex items-center gap-1 text-xs text-purple-400">
                          <Video className="w-3 h-3 shrink-0" />
                          <span className="hidden sm:inline">Videos</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`
                        text-xs px-2.5 py-1 rounded-full font-medium
                        ${post.status === "published"
                          ? "bg-green-500/10 text-green-500 border border-green-500/20"
                          : post.status === "scheduled"
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          : "bg-muted text-muted-foreground border border-border"
                        }
                      `}
                    >
                      {post.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditPost(post._id)}
                      title="Edit post"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
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
                      description={`Are you sure you want to delete "${post.name || "Untitled Post"}"? This action cannot be undone.`}
                      onConfirm={() => handleDeletePost(post._id)}
                      confirmText="Delete"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Form Dialog */}
      <PostForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPost(null);
        }}
        onSubmit={handleUpdatePost}
        post={editingPost}
        projects={projects}
        defaultProjectId={editingPost?.project_id}
      />
    </div>
  );
}
