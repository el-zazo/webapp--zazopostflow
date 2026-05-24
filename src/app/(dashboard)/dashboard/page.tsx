"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, FileText, CalendarCheck, Send, Plus, ImageIcon, Video } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardStats, RecentPost } from "@/types";
import { apiFetch } from "@/lib/api-client";

const DEFAULT_STATS: DashboardStats = {
  totalProjects: 0,
  totalPosts: 0,
  scheduledThisWeek: 0,
  publishedThisMonth: 0,
};


export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const res = await apiFetch("/api/dashboard");

        if (!res.ok) {
          console.error("Dashboard API error:", res.status);
          setFetchError(true);
          setStats(DEFAULT_STATS);
          setRecentPosts([]);
          return;
        }

        const data = await res.json();

        // Defensive: check response format
        if (data && data.success && data.data) {
          // Stats - defensive with fallbacks
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

          // Recent posts - defensive: must be array
          if (Array.isArray(data.data.recentPosts)) {
            setRecentPosts(data.data.recentPosts);
          } else {
            setRecentPosts([]);
          }
        } else {
          // Unexpected format or failed response
          setFetchError(true);
          setStats(DEFAULT_STATS);
          setRecentPosts([]);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setFetchError(true);
        setStats(DEFAULT_STATS);
        setRecentPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Loading state
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

      {/* Recent Activity */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {fetchError ? (
            // API error state - no crash
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
                  {/* Infos post - gauche */}
                  <div className="flex-1 min-w-0">

                    {/* Ligne 1: Titre */}
                    <p className="text-sm font-medium truncate min-w-0">
                      {post.name || "Untitled Post"}
                    </p>

                    {/* Ligne 2: Projet + date */}
                    <p className="text-xs text-muted-foreground truncate mt-0.5 min-w-0">
                      {post.projectName || "Unknown Project"}{" "}&middot;{" "}
                      {post.createdAt
                        ? new Date(post.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Unknown date"}
                    </p>

                    {/* Ligne 3: Type + Media icons */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">

                      {/* Type badge */}
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

                      {/* Media icons */}
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

                  {/* Status badge - droite */}
                  <span
                    className={`
                      text-xs px-2.5 py-1 rounded-full font-medium shrink-0
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
