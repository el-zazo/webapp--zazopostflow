import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

interface CalendarPost {
  _id: string;
  name: string;
  status: string;
  type: string;
  has_images: boolean;
  has_videos: boolean;
  project_name: string;
  date: string;
}

interface PostsByDay {
  [day: string]: CalendarPost[];
}

export function useDatePickerPosts(year: number, month: number) {
  const [postsByDay, setPostsByDay] = useState<PostsByDay>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!year || !month) return;

    setIsLoading(true);
    try {
      const res = await apiFetch(
        `/api/posts/calendar?year=${year}&month=${month}`
      );
      const data = await res.json();

      if (data.success) {
        setPostsByDay(data.data);
      }
    } catch (error) {
      console.error("useDatePickerPosts error:", error);
      setPostsByDay({});
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const getPostsForDay = (day: number): CalendarPost[] => {
    return postsByDay[String(day)] || [];
  };

  const hasPostsOnDay = (day: number): boolean => {
    return (postsByDay[String(day)] || []).length > 0;
  };

  const getPostCountForDay = (day: number): number => {
    return (postsByDay[String(day)] || []).length;
  };

  return {
    postsByDay,
    isLoading,
    getPostsForDay,
    hasPostsOnDay,
    getPostCountForDay,
    refetch: fetchPosts,
  };
}
