"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar, Globe, ImageIcon, Video } from "lucide-react";
import { Post } from "@/types";
import { CopyButton } from "@/components/shared/CopyButton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PostContentViewer } from "./PostContentViewer";

interface PostCardProps {
  post: Post;
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  published: "bg-green-500/10 text-green-400 border-green-500/20",
};

const typeColors: Record<string, string> = {
  main: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  group: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function PostCard({ post, onEdit, onDelete }: PostCardProps) {
  return (
    <Card className="bg-card border-border hover:border-orange-500/30 transition-all duration-300 group overflow-hidden w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 w-full overflow-hidden">
          {/* Titre du post: flex-1 + min-w-0 + overflow-hidden OBLIGATOIRE pour truncate dans flex */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-semibold text-foreground truncate w-full text-base leading-tight group-hover:text-orange-500 transition-colors" title={post.name}>
              {post.name}
            </h3>
          </div>
          {/* Copy button: shrink-0 pour ne jamais rétrécir */}
          <CopyButton text={post.content} className="shrink-0 h-9 w-9 md:h-8 md:w-8" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 overflow-hidden">
        {/* Content preview */}
        <p className="text-sm text-muted-foreground line-clamp-3 break-words whitespace-pre-wrap leading-relaxed bg-muted/50 rounded-md p-3 font-mono text-xs">
          {post.content}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={`${typeColors[post.type]} shrink-0 text-xs`}>
            {post.type}
          </Badge>
          <Badge variant="outline" className={`${statusColors[post.status]} shrink-0 text-xs`}>
            {post.status}
          </Badge>
          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shrink-0 text-xs">
            <Globe className="w-3 h-3 mr-1" />
            {post.platform}
          </Badge>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Media indicators */}
          <div className="flex items-center gap-1.5">
            {post.has_images && (
              <div
                className="flex items-center gap-1 text-xs text-blue-400"
                title="Contains Images"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
            )}
            {post.has_videos && (
              <div
                className="flex items-center gap-1 text-xs text-purple-400"
                title="Contains Videos"
              >
                <Video className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-border">
          {/* View content */}
          <PostContentViewer post={post} />

          {/* Edit post */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(post)}
            title="Edit post"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:h-8 md:w-8 text-destructive hover:text-destructive"
                title="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            }
            title="Delete Post"
            description={`Are you sure you want to delete "${post.name}"? This action cannot be undone.`}
            onConfirm={() => onDelete(post._id)}
            confirmText="Delete"
          />
        </div>
      </CardContent>
    </Card>
  );
}
