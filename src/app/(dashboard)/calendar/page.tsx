"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Post } from "@/types";
import { CopyButton } from "@/components/shared/CopyButton";
import { apiFetch } from "@/lib/api-client";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  published: "bg-green-500/20 text-green-400 border-green-500/30",
};

const dotColors: Record<string, string> = {
  scheduled: "bg-blue-500",
  published: "bg-green-500",
  draft: "bg-gray-500",
};

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/posts?sort=newest");
      const data = await res.json();
      if (data.success) {
        setPosts(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  const getPostsForDay = (day: number) => {
    return posts.filter((post) => {
      if (!post.scheduled_date && !post.published_date) return false;
      const dateStr = post.scheduled_date || post.published_date;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      );
    });
  };

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  const days = [];
  // Empty cells for days before the 1st
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 md:h-28" />);
  }
  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPosts = getPostsForDay(day);
    const isSelected = selectedDay === day;
    const isToday =
      new Date().getDate() === day &&
      new Date().getMonth() === month &&
      new Date().getFullYear() === year;

    days.push(
      <button
        key={day}
        onClick={() => setSelectedDay(day)}
        className={`h-20 sm:h-24 md:h-28 p-1 sm:p-1.5 border border-border rounded-lg text-left transition-all duration-200 hover:bg-accent ${
          isSelected ? "bg-accent ring-2 ring-orange-500" : ""
        } ${isToday ? "border-orange-500/50" : ""}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-xs font-medium ${
              isToday ? "text-orange-500" : "text-muted-foreground"
            }`}
          >
            {day}
          </span>
          {dayPosts.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {dayPosts.length}
            </span>
          )}
        </div>
        <div className="space-y-0.5 overflow-hidden">
          {dayPosts.slice(0, 2).map((post) => (
            <div
              key={post._id}
              className="flex items-center gap-1"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  dotColors[post.status]
                }`}
              />
              <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                {post.name}
              </span>
            </div>
          ))}
          {dayPosts.length > 2 && (
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">
              +{dayPosts.length - 2} more
            </span>
          )}
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          View your posts scheduled by date
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="border-border h-9 w-9 sm:h-10 sm:w-10">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-base sm:text-lg font-semibold text-foreground min-w-[140px] sm:min-w-[180px] text-center">
            {monthName} {year}
          </h3>
          <Button variant="outline" size="icon" onClick={nextMonth} className="border-border h-9 w-9 sm:h-10 sm:w-10">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={goToToday} className="border-border text-xs sm:text-sm h-9 sm:h-10">
          Today
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar Grid */}
        <Card className="bg-card border-border lg:col-span-3">
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1"
                >
                  {day}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">{days}</div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {selectedDay
                ? `${monthName} ${selectedDay}, ${year}`
                : "Select a day"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDay ? (
              <p className="text-xs text-muted-foreground">
                Click on a day to see scheduled posts
              </p>
            ) : selectedDayPosts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No posts for this day
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDayPosts.map((post) => (
                  <div
                    key={post._id}
                    className="bg-card rounded-lg p-3 border border-border space-y-2 overflow-hidden"
                  >
                    {/* Ligne 1: Titre */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate min-w-0 leading-tight">
                        {post.name}
                      </p>
                      <CopyButton text={post.content} className="h-6 w-6 shrink-0" />
                    </div>

                    {/* Ligne 2: Projet */}
                    {post.projectName && (
                      <p className="text-xs text-muted-foreground truncate min-w-0">
                        {post.projectName}
                      </p>
                    )}

                    {/* Ligne 3: Status + Type + Media */}
                    <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
                      {/* Gauche: Status + Type */}
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <Badge
                          variant="outline"
                          className={statusColors[post.status]}
                        >
                          {post.status}
                        </Badge>

                        {post.type && (
                          <span className={`
                            text-xs px-1.5 py-0.5 rounded font-medium shrink-0
                            ${post.type === "main"
                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }
                          `}>
                            {post.type === "main" ? "Main" : "Group"}
                          </span>
                        )}
                      </div>

                      {/* Droite: Media icons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {post.has_images && (
                          <div className="flex items-center gap-1 text-xs text-blue-400">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {post.has_videos && (
                          <div className="flex items-center gap-1 text-xs text-purple-400">
                            <Video className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
