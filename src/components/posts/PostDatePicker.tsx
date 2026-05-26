"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  ImageIcon,
  Video,
  Clock,
  CheckCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDatePickerPosts } from "@/hooks/useDatePickerPosts";
import { cn } from "@/lib/utils";

interface PostDatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  excludePostId?: string;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getStatusColor(status: string): string {
  switch (status) {
    case "published": return "text-green-400";
    case "scheduled": return "text-blue-400";
    default:          return "text-muted-foreground";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "published": return <CheckCircle className="w-3 h-3 shrink-0" />;
    case "scheduled": return <Clock className="w-3 h-3 shrink-0" />;
    default:          return <FileText className="w-3 h-3 shrink-0" />;
  }
}

export function PostDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  label,
  disabled = false,
  excludePostId,
}: PostDatePickerProps) {
  const today = new Date();

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    value ? new Date(value).getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    value ? new Date(value).getMonth() + 1 : today.getMonth() + 1
  );

  const [activeDay, setActiveDay] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    dayPosts,
    loadingCounts,
    loadingDayPosts,
    hasPostsOnDay,
    getPostCountForDay,
    fetchDayPosts,
  } = useDatePickerPosts(viewYear, viewMonth);

  // Fermer si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveDay(null);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const goToPrevMonth = () => {
    setActiveDay(null);
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const goToNextMonth = () => {
    setActiveDay(null);
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectedDate = value ? new Date(value) : null;
  const selectedDay =
    selectedDate &&
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth() + 1 === viewMonth
      ? selectedDate.getDate()
      : null;

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month - 1, 1).getDay();

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const handleDayClick = (day: number) => {
    if (activeDay === day) {
      // 2ème clic → SÉLECTIONNER la date
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`;
      onChange(dateStr);
      setIsOpen(false);
      setActiveDay(null);
    } else {
      // 1er clic → Afficher et charger les posts de ce jour
      setActiveDay(day);
      fetchDayPosts(day);
    }
  };

  // Filtrer les posts du jour pour exclure le post en cours d'édition
  const activeDayPosts = dayPosts.filter(
    (p) => !excludePostId || p._id !== excludePostId
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const formatDisplayDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setActiveDay(null);
        }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-sm",
          "bg-background border-input hover:border-orange-500/50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
          isOpen && "border-orange-500 ring-2 ring-orange-500/20",
          disabled && "opacity-50 cursor-not-allowed",
          !value && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarDays className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>
        {value && !disabled && (
          <X
            className="w-4 h-4 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleClear}
          />
        )}
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 mb-4 bg-card border border-border rounded-xl shadow-xl w-full min-w-[300px] overflow-hidden">
          
          {/* Calendrier */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToPrevMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                {MONTHS[viewMonth - 1]} {viewYear}
                {loadingCounts && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToNextMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs text-muted-foreground font-medium py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isSelected = selectedDay === day;
                const isActive = activeDay === day;
                const isToday =
                  today.getFullYear() === viewYear &&
                  today.getMonth() + 1 === viewMonth &&
                  today.getDate() === day;

                const hasPosts = hasPostsOnDay(day);
                const postCount = getPostCountForDay(day);

                return (
                  <div
                    key={day}
                    className="relative flex flex-col items-center"
                  >
                    <button
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "w-8 h-8 rounded-full text-xs font-medium transition-all duration-150",
                        "flex items-center justify-center",

                        isSelected &&
                          "bg-orange-500 text-white font-bold shadow-[0_0_12px_rgba(249,115,22,0.4)]",

                        isActive &&
                          !isSelected &&
                          "bg-orange-500/20 text-orange-400 ring-2 ring-orange-500/40",

                        isToday &&
                          !isSelected &&
                          !isActive &&
                          "border-2 border-orange-500/50 text-orange-400",

                        !isSelected &&
                          !isActive &&
                          "hover:bg-orange-500/10 hover:text-orange-400",

                        !isSelected &&
                          !isActive &&
                          !isToday &&
                          (hasPosts ? "text-foreground" : "text-muted-foreground")
                      )}
                    >
                      {day}
                    </button>

                    {/* Indicateurs simplifiés sous le jour */}
                    {hasPosts && (
                      <div className="flex gap-0.5 mt-0.5 justify-center">
                        {Array.from({ length: Math.min(postCount, 3) }).map((_, idx) => (
                          <div
                            key={idx}
                            className="w-1 h-1 rounded-full bg-orange-500/60"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel Posts du Jour (EN BAS) */}
          {activeDay !== null && (
            <div className="border-t border-border bg-muted/20">
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-foreground">
                    {MONTHS[viewMonth - 1]} {activeDay}
                  </span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0">
                    {activeDayPosts.length} post{activeDayPosts.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {activeDayPosts.length > 0
                    ? "Click again to select"
                    : "No posts — Click again to select"}
                </span>
              </div>

              {loadingDayPosts ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                </div>
              ) : activeDayPosts.length > 0 ? (
                <div className="overflow-y-auto max-h-[200px] px-4 pb-3 space-y-2">
                  {activeDayPosts.map((post: any) => (
                    <div
                      key={post._id}
                      className="bg-card rounded-lg p-2.5 border border-border overflow-hidden space-y-1.5"
                    >
                      <p className="text-xs font-medium text-foreground truncate w-full min-w-0 leading-tight">
                        {post.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate w-full min-w-0">
                        {post.project_name}
                      </p>

                      <div className="flex items-center justify-between gap-1.5 min-w-0 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <div className={cn(
                            "flex items-center gap-1 text-xs shrink-0",
                            getStatusColor(post.status)
                          )}>
                            {getStatusIcon(post.status)}
                            <span className="capitalize">{post.status}</span>
                          </div>
                          <span className="text-muted-foreground text-xs shrink-0">&middot;</span>
                          <span className={`
                            text-xs px-1 py-0.5 rounded font-medium shrink-0
                            ${post.type === "main" ? "bg-orange-500/10 text-orange-400" : "bg-purple-500/10 text-purple-400"}
                          `}>
                            {post.type === "main" ? "Main" : "Group"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 pb-3">
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No posts scheduled for this day.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth() + 1);
                setActiveDay(now.getDate());
                fetchDayPosts(now.getDate());
              }}
            >
              Today
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              >
                Clear date
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}