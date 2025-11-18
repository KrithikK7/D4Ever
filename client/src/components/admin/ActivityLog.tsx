import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, BookOpen, FileText, Filter } from "lucide-react";
import { format } from "date-fns";

interface ActivityLogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  duration: number | null;
  username: string;
  chapter_title: string;
  section_title: string;
  page_number: number;
}

export function ActivityLog() {
  const [userFilter, setUserFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [chapterFilter, setChapterFilter] = useState<string>("all");

  const queryParams = new URLSearchParams();
  if (userFilter && userFilter !== "all") queryParams.set("userId", userFilter);
  if (eventTypeFilter && eventTypeFilter !== "all") queryParams.set("eventType", eventTypeFilter);
  if (chapterFilter && chapterFilter !== "all") queryParams.set("chapterId", chapterFilter);

  const { data: activityLog = [], isLoading } = useQuery<ActivityLogEntry[]>({
    queryKey: ["/api/analytics/activity-log", userFilter, eventTypeFilter, chapterFilter],
    queryFn: async () => {
      const url = `/api/analytics/activity-log?${queryParams.toString()}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch activity log");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<Array<{ id: string; username: string }>>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: chapters = [] } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ["/api/chapters"],
  });

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, "MMM d, yyyy h:mm:ss a");
    } catch {
      return timestamp;
    }
  };

  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case "page_view":
        return "default";
      case "section_completed":
        return "secondary";
      default:
        return "outline";
    }
  };

  const clearFilters = () => {
    setUserFilter("all");
    setEventTypeFilter("all");
    setChapterFilter("all");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-myeongjo text-2xl font-bold text-kdrama-ink dark:text-foreground">
          Activity Log
        </h2>
        <p className="font-noto text-sm text-muted-foreground mt-1">
          Detailed reading activity with timestamps and durations
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-myeongjo flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-noto text-sm font-medium mb-2 block">User</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger data-testid="select-user-filter">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">Event Type</label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger data-testid="select-event-type-filter">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="page_view">Page View</SelectItem>
                  <SelectItem value="section_completed">Section Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">Chapter</label>
              <Select value={chapterFilter} onValueChange={setChapterFilter}>
                <SelectTrigger data-testid="select-chapter-filter">
                  <SelectValue placeholder="All chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chapters</SelectItem>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(userFilter !== "all" || eventTypeFilter !== "all" || chapterFilter !== "all") && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Log Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="font-noto text-muted-foreground">Loading activity log...</p>
            </div>
          ) : activityLog.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="font-noto text-muted-foreground">No activity found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="font-noto text-left text-sm font-medium px-4 py-3">Timestamp</th>
                    <th className="font-noto text-left text-sm font-medium px-4 py-3">User</th>
                    <th className="font-noto text-left text-sm font-medium px-4 py-3">Chapter</th>
                    <th className="font-noto text-left text-sm font-medium px-4 py-3">Section</th>
                    <th className="font-noto text-left text-sm font-medium px-4 py-3">Page</th>
                    <th className="font-noto text-left text-sm font-medium px-4 py-3">Duration</th>
                    <th className="font-noto text-left text-sm font-medium px-4 py-3">Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activityLog.map((entry) => (
                    <tr key={entry.id} className="hover-elevate" data-testid={`row-activity-${entry.id}`}>
                      <td className="font-noto text-sm px-4 py-3" data-testid={`text-timestamp-${entry.id}`}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {formatTimestamp(entry.timestamp)}
                        </div>
                      </td>
                      <td className="font-noto text-sm px-4 py-3" data-testid={`text-username-${entry.id}`}>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {entry.username}
                        </div>
                      </td>
                      <td className="font-myeongjo text-sm px-4 py-3 max-w-xs truncate" data-testid={`text-chapter-${entry.id}`}>
                        {entry.chapter_title}
                      </td>
                      <td className="font-myeongjo text-sm px-4 py-3 max-w-xs truncate" data-testid={`text-section-${entry.id}`}>
                        {entry.section_title}
                      </td>
                      <td className="font-noto text-sm px-4 py-3" data-testid={`text-page-${entry.id}`}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          Page {entry.page_number}
                        </div>
                      </td>
                      <td className="font-noto text-sm px-4 py-3 text-kdrama-thread font-medium" data-testid={`text-duration-${entry.id}`}>
                        {formatDuration(entry.duration)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getEventBadgeVariant(entry.event_type)} className="font-noto text-xs" data-testid={`badge-event-${entry.id}`}>
                          {entry.event_type === "page_view" ? "Page View" : "Section Completed"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {activityLog.length > 0 && (
        <p className="font-noto text-xs text-muted-foreground text-center">
          Showing {activityLog.length} most recent activities (max 1000)
        </p>
      )}
    </div>
  );
}
