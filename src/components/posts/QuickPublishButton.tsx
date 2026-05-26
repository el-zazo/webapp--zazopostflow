"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EyeOff, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Post } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface QuickPublishButtonProps {
  post: Post;
  onSuccess: () => void;
  className?: string;
}

/**
 * QuickPublishButton - Premium, modern and minimalist publish toggler.
 * Uses a clean "ghost" variant style matching our application design guidelines.
 */
export function QuickPublishButton({ post, onSuccess, className }: QuickPublishButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);
  const { toast } = useToast();

  const isPublished = post.status === "published";

  const handleToggle = async () => {
    // Double-click protection via ref
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      const newStatus = isPublished
        ? (post.scheduled_date ? "scheduled" : "draft")
        : "published";

      const payload: Record<string, unknown> = {
        status: newStatus,
      };

      if (newStatus === "published") {
        payload.published_date = new Date().toISOString();
      } else {
        payload.published_date = null;
      }

      const res = await apiFetch(`/api/posts/${post._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await res.json()) as { success: boolean; error?: string };

      if (result.success) {
        toast({
          title: isPublished ? "Post unpublished" : "Post published",
          description: isPublished
            ? `"${post.name}" is now reverted to ${newStatus}`
            : `"${post.name}" has been published successfully`,
        });
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  if (isPublished) {
    // Unpublish requires confirmation with custom soft-red destructive hover state
    return (
      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading}
            className={cn(
              "h-9 w-9 md:h-8 md:w-8 text-green-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200 shrink-0",
              className
            )}
            title="Published (Click to unpublish)"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4.5 h-4.5" />
            )}
          </Button>
        }
        title="Unpublish Post"
        description={`Are you sure you want to unpublish "${post.name}"? It will be reverted to ${post.scheduled_date ? "scheduled" : "draft"} and the publish date will be cleared.`}
        onConfirm={handleToggle}
        confirmText="Unpublish"
        variant="destructive"
      />
    );
  }

  // Publish button (subtle gray that turns to active green on hover)
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "h-9 w-9 md:h-8 md:w-8 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all duration-200 shrink-0",
        className
      )}
      title="Mark as Published"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Send className="w-4.5 h-4.5" />
      )}
    </Button>
  );
}