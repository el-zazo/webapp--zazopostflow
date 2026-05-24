"use client";

import { useState } from "react";
import { Eye, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageIcon, Video } from "lucide-react";

interface Post {
  _id: string;
  name?: string;
  title?: string;
  content: string;
  status: string;
  type: string;
  scheduled_date?: string;
  published_date?: string;
  has_images?: boolean;
  has_videos?: boolean;
}

interface PostContentViewerProps {
  post: Post;
}

export function PostContentViewer({ post }: PostContentViewerProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // [FIX #16] Encapsulation dans try/catch de navigator.clipboard.writeText().
  // Avant: L'appel était fait sans gestion d'erreur. navigator.clipboard.writeText()
  // peut lever une exception dans plusieurs cas réels:
  // - Page servie en HTTP (pas HTTPS) — fréquent en staging/dev
  // - Document pas focusé (utilisateur a changé d'onglet)
  // - Permissions du presse-papier refusées par le navigateur
  // - Certains contextes Firefox
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(post.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: sélectionner le texte dans le dialogue pour copie manuelle
      // ou simplement ignorer silencieusement (le bouton ne fait rien)
      setCopied(false);
    }
  };

  const charCount = post.content?.length || 0;
  const isOverLimit = charCount > 3000;

  return (
    <>
      {/* Bouton trigger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="View content"
      >
        <Eye className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="
            max-w-2xl w-full
            h-[90vh] max-h-[90vh]
            flex flex-col
            p-0
            overflow-hidden
            gap-0
          "
        >
          {/* ── Header fixe ── */}
          <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <DialogHeader>
              <DialogTitle className="text-lg truncate pr-8">
                {post.name || post.title || "Post Content"}
              </DialogTitle>
            </DialogHeader>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant="outline" className="text-xs">
                {post.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {post.type}
              </Badge>
              {post.scheduled_date && (
                <Badge variant="outline" className="text-xs">
                  Scheduled: {new Date(post.scheduled_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Badge>
              )}
              {post.published_date && (
                <Badge variant="outline" className="text-xs">
                  Published: {new Date(post.published_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Badge>
              )}
              {post.has_images && (
                <Badge
                  variant="outline"
                  className="text-xs border-blue-500/30 bg-blue-500/5 text-blue-400 gap-1"
                >
                  <ImageIcon className="w-3 h-3" />
                  Images
                </Badge>
              )}
              {post.has_videos && (
                <Badge
                  variant="outline"
                  className="text-xs border-purple-500/30 bg-purple-500/5 text-purple-400 gap-1"
                >
                  <Video className="w-3 h-3" />
                  Videos
                </Badge>
              )}
            </div>
          </div>

          {/* ── Contenu scrollable ── */}
          <div
            className="flex-1 overflow-y-auto px-6 py-4"
            style={{ overflowY: "auto" }}
          >
            <div className="bg-muted/30 rounded-lg p-4 border border-border min-h-full">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed break-words">
                {post.content || (
                  <span className="text-muted-foreground italic">
                    No content
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ── Footer fixe ── */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-border">
            <span
              className={`text-xs ${
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {charCount.toLocaleString()} characters
              {isOverLimit && (
                <span className="ml-1 font-medium">(exceeds LinkedIn 3000 limit)</span>
              )}
            </span>

            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Content
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
