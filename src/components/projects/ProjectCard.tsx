"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github, Eye, Pencil, Trash2, FolderOpen } from "lucide-react";
import { Project } from "@/types";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const hasLinks = project.github_link || project.demo_link;

  return (
    <Card className="bg-card border-border hover:border-orange-500/30 transition-all duration-300 group flex flex-col overflow-hidden w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 w-full overflow-hidden">
          {/* Titre + Description: flex-1 + min-w-0 + overflow-hidden OBLIGATOIRE pour truncate dans flex */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-semibold text-foreground truncate w-full text-base leading-tight group-hover:text-orange-500 transition-colors" title={project.name}>
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 break-words whitespace-pre-line">
                {project.description}
              </p>
            )}
          </div>

          {/* Badge status: shrink-0 pour ne jamais rétrécir */}
          <Badge
            variant="outline"
            className={
              project.status === "active"
                ? "bg-green-500/10 text-green-500 border-green-500/20 whitespace-nowrap text-xs shrink-0"
                : project.status === "completed"
                ? "bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap text-xs shrink-0"
                : "whitespace-nowrap text-xs shrink-0"
            }
          >
            {project.status}
          </Badge>
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag._id}
                variant="outline"
                className="border-orange-500/30 text-orange-400 text-xs truncate max-w-[120px]"
              >
                {tag.name}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <Badge className="text-xs shrink-0">
                +{project.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col overflow-hidden">
        {/* Posts count */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          <span>
            {project.postsCount || 0} post{(project.postsCount || 0) !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Links — only render if there are actual links */}
        {hasLinks && (
          <div className="flex items-center gap-2">
            {project.github_link && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:h-8 md:w-8 shrink-0"
                asChild
              >
                <a
                  href={project.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="w-4 h-4" />
                </a>
              </Button>
            )}
            {project.demo_link && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:h-8 md:w-8 shrink-0"
                asChild
              >
                <a
                  href={project.demo_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Spacer to push actions to bottom */}
        <div className="flex-1" />

        {/* Actions — always at the bottom */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 min-w-0 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 h-9 md:h-8"
            asChild
          >
            <Link href={`/projects/${project._id}`}>
              <Eye className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline ml-1.5">View Posts</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:h-8 md:w-8 shrink-0"
            onClick={() => onEdit(project)}
            title="Edit project"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8 shrink-0 text-destructive hover:text-destructive" title="Delete project">
                <Trash2 className="w-4 h-4" />
              </Button>
            }
            title="Delete Project"
            description={`Are you sure you want to delete "${project.name}"? All posts in this project will also be deleted. This action cannot be undone.`}
            onConfirm={() => onDelete(project._id)}
            confirmText="Delete"
          />
        </div>
      </CardContent>
    </Card>
  );
}
