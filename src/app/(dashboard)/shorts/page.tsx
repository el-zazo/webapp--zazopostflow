"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Film, Plus, Globe, Calendar, ImageIcon, Video, ExternalLink, Github, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickPublishButton } from "@/components/posts/QuickPublishButton";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLSectionElement>>(new Map());

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/posts/shorts");
      const data = await res.json();
      if (data.success) {
        setPosts(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch shorts posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Handle scroll-snap to track current post index
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

  const scrollToPost = (index: number) => {
    const section = sectionRefs.current.get(index);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
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
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-[calc(100vh-2rem)] flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl px-4">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-[60vh] rounded-xl" />
        </div>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="h-[calc(100vh-2rem)] flex items-center justify-center">
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
    <div className="relative h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
      {/* Navigation arrows (desktop) */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm border-border"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          title="Previous post"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        <div className="text-center text-xs text-muted-foreground py-1">
          {currentIndex + 1}/{posts.length}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm border-border"
          onClick={goToNext}
          disabled={currentIndex === posts.length - 1}
          title="Next post"
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      </div>

      {/* Scrollable container with snap */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {posts.map((post, index) => (
          <section
            key={post._id}
            ref={(el) => {
              if (el) {
                sectionRefs.current.set(index, el);
              } else {
                sectionRefs.current.delete(index);
              }
            }}
            className="min-h-screen snap-start flex flex-col"
            style={{ scrollSnapAlign: "start" }}
          >
            {/* Project Info Card (top) */}
            <div className="bg-card border-b border-border p-4 safe-top">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/projects/${post.project._id}`}
                      className="text-sm font-semibold text-foreground hover:text-orange-500 transition-colors truncate block"
                      title={post.project.name}
                    >
                      {post.project.name}
                    </Link>
                    {post.project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {post.project.tags.slice(0, 5).map((tag) => (
                          <Badge
                            key={tag._id}
                            variant="outline"
                            className="border-orange-500/30 text-orange-400 text-[10px] px-1.5 py-0 max-w-[120px] truncate"
                            title={tag.name}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {post.project.tags.length > 5 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{post.project.tags.length - 5}
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
                        className="text-muted-foreground hover:text-foreground transition-colors"
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
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Demo"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Post Content Card (center, scrollable) */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Post title */}
                <h2
                  className="text-xl font-bold text-foreground truncate"
                  title={post.name}
                >
                  {post.name}
                </h2>

                {/* Post content */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <pre className="whitespace-pre-wrap break-words text-sm text-foreground font-mono leading-relaxed max-h-[40vh] overflow-y-auto">
                    {post.content}
                  </pre>
                </div>

                {/* Status + Type + Media + Platform */}
                <div className="flex flex-wrap items-center gap-2">
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
                    <Globe className="w-3 h-3 mr-1" />
                    {post.platform}
                  </Badge>

                  {/* Media indicators */}
                  {post.has_images && (
                    <div className="flex items-center gap-1 text-xs text-blue-400">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Images</span>
                    </div>
                  )}
                  {post.has_videos && (
                    <div className="flex items-center gap-1 text-xs text-purple-400">
                      <Video className="w-3.5 h-3.5" />
                      <span>Videos</span>
                    </div>
                  )}

                  <div className="flex-1" />

                  {/* Quick Publish/Unpublish */}
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
                    onSuccess={() => fetchPosts()}
                  />
                </div>

                {/* Dates */}
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {post.scheduled_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>
                        Scheduled: {new Date(post.scheduled_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {post.published_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-green-400 shrink-0" />
                      <span>
                        Published: {new Date(post.published_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="text-muted-foreground/60">
                    Created: {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Mobile progress indicator */}
      <div className="md:hidden fixed bottom-20 right-4 z-20 bg-card/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-muted-foreground border border-border">
        {currentIndex + 1}/{posts.length}
      </div>
    </div>
  );
}
