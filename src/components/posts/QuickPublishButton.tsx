"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EyeOff, Send, Loader2 } from "lucide-react";
import { Post } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";

interface QuickPublishButtonProps {
  post: Post;
  onSuccess: () => void;
}

/**
 * QuickPublishButton - Toggle button to publish/unpublish a post.
 *
 * - If post is "published" → Unpublish: reverts to "scheduled" (if scheduled_date exists) or "draft"
 * - If post is NOT "published" → Publish: sets status to "published" + published_date = now()
 * - Uses ConfirmDialog for unpublish action to prevent accidental data loss
 * - Uses loadingRef for double-click protection
 */
export function QuickPublishButton({ post, onSuccess }: QuickPublishButtonProps) {
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
        // When unpublishing, clear published_date
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
            ? `"${post.name}" is now ${newStatus}`
            : `"${post.name}" has been published`,
        });
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update post status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Quick publish error:", error);
      toast({
        title: "Error",
        description: "Failed to update post status",
        variant: "destructive",
      });
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  if (isPublished) {
    // Unpublish requires confirmation
    return (
      <ConfirmDialog
        trigger={
          <Button
            size="icon"
            variant="destructive"
            title="Unpublish"
            disabled={isLoading}
            className="h-9 w-9 md:h-8 md:w-8"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>
        }
        title="Unpublish Post"
        description={`Are you sure you want to unpublish "${post.name}"? The post will be reverted to ${post.scheduled_date ? "scheduled" : "draft"} status and its published date will be cleared.`}
        onConfirm={handleToggle}
        confirmText="Unpublish"
        variant="destructive"
      />
    );
  }

  // Publish doesn't require confirmation
  return (
    <Button
      size="icon"
      variant="default"
      onClick={handleToggle}
      title="Publish now"
      disabled={isLoading}
      className="h-9 w-9 md:h-8 md:w-8 bg-green-600 hover:bg-green-700 text-white"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Send className="w-4 h-4" />
      )}
    </Button>
  );
}
