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

export function useDatePickerPosts(year: number, month: number) {
  const [countsByDay, setCountsByDay] = useState<Record<string, number>>({});
  const [dayPosts, setDayPosts] = useState<CalendarPost[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [loadingDayPosts, setLoadingDayPosts] = useState(false);

  // 1. Fetch des totaux par jour pour le mois sélectionné
  const fetchCounts = useCallback(async () => {
    if (!year || !month) return;

    setLoadingCounts(true);
    try {
      const res = await apiFetch(`/api/posts/calendar?year=${year}&month=${month}`);
      const data = (await res.json()) as { success: boolean; data: Record<string, number> };

      if (data.success) {
        setCountsByDay(data.data);
      }
    } catch (error) {
      console.error("useDatePickerPosts counts error:", error);
      setCountsByDay({});
    } finally {
      setLoadingCounts(false);
    }
  }, [year, month]);

  // Re-fetch les counts quand le mois/année change + Reset les posts chargés du jour actif
  useEffect(() => {
    fetchCounts();
    setDayPosts([]);
  }, [fetchCounts]);

  // 2. Fetch des posts complets pour un jour spécifique au clic
  const fetchDayPosts = useCallback(async (day: number) => {
    if (!year || !month || !day) return;

    setLoadingDayPosts(true);
    try {
      const res = await apiFetch(
        `/api/posts/calendar/day?year=${year}&month=${month}&day=${day}`
      );
      const data = (await res.json()) as { success: boolean; data: CalendarPost[] };

      if (data.success) {
        setDayPosts(data.data);
      }
    } catch (error) {
      console.error("useDatePickerPosts day posts error:", error);
      setDayPosts([]);
    } finally {
      setLoadingDayPosts(false);
    }
  }, [year, month]);

  const hasPostsOnDay = (day: number): boolean => {
    return (countsByDay[String(day)] || 0) > 0;
  };

  const getPostCountForDay = (day: number): number => {
    return countsByDay[String(day)] || 0;
  };

  return {
    countsByDay,
    dayPosts,
    loadingCounts,
    loadingDayPosts,
    hasPostsOnDay,
    getPostCountForDay,
    fetchDayPosts,
    refetchCounts: fetchCounts,
  };
}