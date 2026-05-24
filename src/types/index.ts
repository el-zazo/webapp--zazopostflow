export interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string | null;
  theme: "dark" | "light";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  user_id: string;
  name: string;
  description: string;
  github_link: string;
  demo_link: string;
  tags: { _id: string; name: string }[];
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  postsCount?: number;
}

export interface Post {
  _id: string;
  project_id: string;
  name: string;
  content: string;
  type: "main" | "group";
  platform: string;
  scheduled_date: string | null;
  published_date: string | null;
  status: "draft" | "scheduled" | "published";
  has_videos: boolean;
  has_images: boolean;
  createdAt: string;
  updatedAt: string;
  projectName?: string;
}

export interface Tag {
  _id: string;
  user_id: string;
  name: string;
  projectsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalPosts: number;
  scheduledThisWeek: number;
  publishedThisMonth: number;
}

export interface RecentPost {
  _id: string;
  name: string;
  status: "draft" | "scheduled" | "published";
  type?: string;
  has_images?: boolean;
  has_videos?: boolean;
  createdAt: string;
  projectName: string;
  projectId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
