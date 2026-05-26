"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, PlusCircle, Loader2 } from "lucide-react";
import { Project, Tag } from "@/types";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { apiFetch } from "@/lib/api-client";

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().max(500).optional(),
  github_link: z.string().url("Invalid URL").or(z.literal("")).optional(),
  demo_link: z.string().url("Invalid URL").or(z.literal("")).optional(),
  status: z.enum(["active", "archived", "completed"]).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface SelectedTag {
  _id: string;
  name: string;
}

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormValues & { tags: string[] }) => void;
  project?: Project | null;
}

const EMPTY_FORM: ProjectFormValues = {
  name: "",
  description: "",
  github_link: "",
  demo_link: "",
  status: "active",
};

export function ProjectForm({ open, onClose, onSubmit, project }: ProjectFormProps) {
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: EMPTY_FORM,
  });

  // Reset form + tags whenever the dialog opens or the project prop changes
  useEffect(() => {
    if (open) {
      // project.tags is now [{_id, name}] after populate
      const populatedTags = (project?.tags || []).map((t: any) => ({
        _id: typeof t === "string" ? t : t._id,
        name: typeof t === "string" ? t : t.name,
      }));
      setSelectedTags(populatedTags);
      form.reset({
        name: project?.name || "",
        description: project?.description || "",
        github_link: project?.github_link || "",
        demo_link: project?.demo_link || "",
        status: project?.status || "active",
      });
      setTagSearch("");
      setDropdownOpen(false);
    }
  }, [project, open, form]);

  // Fetch all user tags when dialog opens
  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open]);

  const fetchTags = async () => {
    try {
      const res = await apiFetch("/api/tags?limit=100");
      const data = (await res.json()) as { success: boolean; data: Tag[] };
      if (data.success) {
        setAllTags(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter tags by search, exclude already selected (by _id)
  const selectedTagIds = new Set(selectedTags.map((t) => t._id));
  const filteredTags = allTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !selectedTagIds.has(tag._id)
  );

  // Check if the search text matches any existing tag (for inline create)
  const exactMatch = allTags.some(
    (tag) => tag.name.toLowerCase() === tagSearch.toLowerCase()
  );
  const canCreateInline = tagSearch.trim().length > 0 && !exactMatch;

  const handleSelectTag = (tag: { _id: string; name: string }) => {
    if (!selectedTagIds.has(tag._id)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setTagSearch("");
    setDropdownOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((t) => t._id !== tagId));
  };

  const handleCreateAndSelect = async () => {
    const name = tagSearch.trim();
    if (!name) return;

    setCreatingTag(true);
    try {
      const res = await apiFetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = (await res.json()) as { success: boolean; data: { _id: string } };

      if (result.success) {
        // Add the newly created tag with its _id
        setSelectedTags([...selectedTags, { _id: result.data._id, name }]);
        setTagSearch("");
        setDropdownOpen(false);
        // Refresh tags list
        fetchTags();
      }
      // If tag already exists (409), select it from allTags
      else if (res.status === 409) {
        const existingTag = allTags.find(
          (t) => t.name.toLowerCase() === name.toLowerCase()
        );
        if (existingTag && !selectedTagIds.has(existingTag._id)) {
          setSelectedTags([...selectedTags, { _id: existingTag._id, name: existingTag.name }]);
        }
        setTagSearch("");
        setDropdownOpen(false);
        fetchTags();
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setCreatingTag(false);
    }
  };

  // Full cleanup on close so next open starts fresh
  const handleClose = () => {
    setSelectedTags([]);
    setTagSearch("");
    setDropdownOpen(false);
    form.reset(EMPTY_FORM);
    onClose();
  };

  const { isLoading: isSubmitting, execute } = useAsyncAction();

  const handleSubmit = (data: ProjectFormValues) => {
    // Send tags as array of ObjectId strings, wrapped with double-click protection
    execute(async () => {
      await onSubmit({ ...data, tags: selectedTags.map((t) => t._id) });
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {project ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Awesome Project"
                      className="bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of your project..."
                      className="bg-background border-border resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="github_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub Link</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/..."
                      className="bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="demo_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Demo Link</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://..."
                      className="bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags — Searchable Dropdown */}
            <div className="space-y-2">
              <FormLabel>Tech Tags</FormLabel>

              {/* Selected tags as removable badges */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag._id}
                      variant="outline"
                      className="border-orange-500/30 bg-orange-500/5 text-orange-400 gap-1"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag._id)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search input + dropdown */}
              <div className="relative" ref={dropdownRef}>
                <Input
                  placeholder="Search or create a tag..."
                  className="bg-background border-border"
                  value={tagSearch}
                  onChange={(e) => {
                    setTagSearch(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      // If only one filtered tag, select it
                      if (filteredTags.length === 1) {
                        handleSelectTag({ _id: filteredTags[0]._id, name: filteredTags[0].name });
                      } else if (canCreateInline) {
                        handleCreateAndSelect();
                      }
                    }
                  }}
                />

                {/* Dropdown */}
                {dropdownOpen && (filteredTags.length > 0 || canCreateInline) && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-[200px] overflow-auto">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag._id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors flex items-center justify-between group"
                        onClick={() => handleSelectTag({ _id: tag._id, name: tag.name })}
                      >
                        <span className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-orange-500/30 bg-orange-500/5 text-orange-400 text-xs pointer-events-none"
                          >
                            {tag.name}
                          </Badge>
                        </span>
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          {tag.projectsCount ?? 0} project{(tag.projectsCount ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </button>
                    ))}

                    {/* Create new option */}
                    {canCreateInline && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-orange-500 hover:bg-orange-500/5 transition-colors flex items-center gap-2 border-t border-border"
                        onClick={handleCreateAndSelect}
                        disabled={creatingTag}
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>
                          {creatingTag ? "Creating..." : `Create "${tagSearch.trim()}"`}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  {/* [FIX #11] defaultValue → value pour que form.reset()
                      mette à jour l'affichage du Select lors de l'édition.
                      Avant: defaultValue ne réagissait qu'au premier mount,
                      donc un projet "archived" affichait toujours "Active". */}
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-border w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {project ? "Updating" : "Creating"}...
                  </>
                ) : (
                  <>{project ? "Update" : "Create"} Project</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
