"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Post, Project } from "@/types";
import { Loader2, ImageIcon, Video } from "lucide-react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { Checkbox } from "@/components/ui/checkbox";
import { PostDatePicker } from "@/components/posts/PostDatePicker";

const postFormSchema = z.object({
  project_id: z.string().min(1, "Project is required"),
  name: z.string().min(1, "Post name is required").max(100),
  content: z.string().min(1, "Post content is required"),
  type: z.enum(["main", "group"]),
  platform: z.string().optional(),
  scheduled_date: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === "") return "";
      const date = new Date(val);
      return isNaN(date.getTime()) ? "" : val;
    }),
  published_date: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === "") return "";
      const date = new Date(val);
      return isNaN(date.getTime()) ? "" : val;
    }),
  status: z.enum(["draft", "scheduled", "published"]),
  has_videos: z.boolean().default(false),
  has_images: z.boolean().default(false),
});

type PostFormValues = z.infer<typeof postFormSchema>;

interface PostFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PostFormValues) => void;
  post?: Post | null;
  projects: Project[];
  defaultProjectId?: string;
}

export function PostForm({
  open,
  onClose,
  onSubmit,
  post,
  projects,
  defaultProjectId,
}: PostFormProps) {
  const { isLoading: isSubmitting, execute } = useAsyncAction();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      project_id: post?.project_id || defaultProjectId || "",
      name: post?.name || "",
      content: post?.content || "",
      type: post?.type || "main",
      platform: post?.platform || "LinkedIn",
      scheduled_date: post?.scheduled_date
        ? new Date(post.scheduled_date).toISOString()
        : "",
      published_date: post?.published_date
        ? new Date(post.published_date).toISOString()
        : "",
      status: post?.status || "draft",
      has_videos: post?.has_videos || false,
      has_images: post?.has_images || false,
    },
  });

  const watchedStatus = form.watch("status");

  useEffect(() => {
    if (post) {
      form.reset({
        project_id: post.project_id,
        name: post.name,
        content: post.content,
        type: post.type,
        platform: post.platform,
        scheduled_date: post.scheduled_date
          ? new Date(post.scheduled_date).toISOString()
          : "",
        published_date: post.published_date
          ? new Date(post.published_date).toISOString()
          : "",
        status: post.status,
        has_videos: post.has_videos || false,
        has_images: post.has_images || false,
      });
    } else {
      form.reset({
        project_id: defaultProjectId || "",
        name: "",
        content: "",
        type: "main",
        platform: "LinkedIn",
        scheduled_date: "",
        published_date: "",
        status: "draft",
        has_videos: false,
        has_images: false,
      });
    }
  }, [post, defaultProjectId, form]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {post ? "Edit Post" : "New Post"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            execute(async () => { await onSubmit(data); });
          })} className="space-y-4">
            {!defaultProjectId && (
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border">
                        {projects.map((project) => (
                          <SelectItem key={project._id} value={project._id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My LinkedIn Post"
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your LinkedIn post content here..."
                      className="bg-background border-border resize-none min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
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
                        <SelectItem value="main">Main</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
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
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="scheduled_date"
              render={({ field }) => (
                <FormItem className="pb-4">
                  <FormControl>
                    <PostDatePicker
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Pick a scheduled date"
                      label="Scheduled Date"
                      excludePostId={post?._id}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedStatus === "published" && (
              <FormField
                control={form.control}
                name="published_date"
                render={({ field }) => (
                  <FormItem className="pb-4">
                    <FormControl>
                      <PostDatePicker
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Pick a published date"
                        label="Published Date"
                        excludePostId={post?._id}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Media Content */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Media Content
              </label>
              <div className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-muted/20">
                <FormField
                  control={form.control}
                  name="has_images"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="has_images"
                        />
                      </FormControl>
                      <label
                        htmlFor="has_images"
                        className="flex items-center gap-2 text-sm cursor-pointer select-none"
                      >
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                        <span className="text-foreground">Contains Images</span>
                      </label>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="has_videos"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="has_videos"
                        />
                      </FormControl>
                      <label
                        htmlFor="has_videos"
                        className="flex items-center gap-2 text-sm cursor-pointer select-none"
                      >
                        <Video className="w-4 h-4 text-purple-400" />
                        <span className="text-foreground">Contains Videos</span>
                      </label>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
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
                    {post ? "Updating" : "Creating"}...
                  </>
                ) : (
                  <>{post ? "Update" : "Create"} Post</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
