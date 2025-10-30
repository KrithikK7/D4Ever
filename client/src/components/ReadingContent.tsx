import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Knot } from "./Knot";

interface ReadingContentProps {
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  publishedAt?: Date | string;
  coverUrl?: string;
  showMilestones?: boolean;
}

export function ReadingContent({
  title,
  content,
  mood,
  tags = [],
  publishedAt,
  coverUrl,
  showMilestones = true,
}: ReadingContentProps) {
  const paragraphs = content.split("\n\n").filter((p) => p.trim());

  const publishedDate = useMemo(() => {
    if (!publishedAt) {
      return undefined;
    }

    const value = publishedAt as unknown as string | Date;
    const date = typeof value === "string" ? new Date(value) : value;

    return Number.isNaN(date.getTime()) ? undefined : date;
  }, [publishedAt]);

  const publishedDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }),
    [],
  );
  const publishedTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }),
    [],
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        {coverUrl && (
          <div className="relative mb-6 rounded-2xl overflow-hidden shadow-lg">
            <img src={coverUrl} alt={title} className="w-full h-64 object-cover" />
            <div className="absolute top-4 left-4">
              <Knot size="lg" tone="primary" />
            </div>
          </div>
        )}
        
        <h1 className="font-myeongjo text-4xl md:text-5xl font-bold text-kdrama-ink dark:text-foreground mb-4">
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          {mood && (
            <Badge variant="secondary" className="font-noto">
              {mood}
            </Badge>
          )}
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="font-noto">
              #{tag}
            </Badge>
          ))}
        </div>

        {publishedDate && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-noto">
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              <span>{publishedDateFormatter.format(publishedDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{publishedTimeFormatter.format(publishedDate)}</span>
            </div>
          </div>
        )}
      </div>

      <Card className="p-8 md:p-12 bg-white/80 dark:bg-card/80 backdrop-blur-sm border-0 shadow-md">
        <div className="prose prose-lg max-w-none font-noto">
          {paragraphs.map((paragraph, index) => (
            <div key={index} className="relative">
              {showMilestones && index === Math.floor(paragraphs.length * 0.25) && (
                <div
                  className="absolute -left-8 top-0"
                  data-milestone="25"
                  aria-label="25% reading progress marker"
                >
                  <Knot size="sm" tone="muted" />
                </div>
              )}
              {showMilestones && index === Math.floor(paragraphs.length * 0.5) && (
                <div
                  className="absolute -left-8 top-0"
                  data-milestone="50"
                  aria-label="50% reading progress marker"
                >
                  <Knot size="sm" tone="muted" />
                </div>
              )}
              {showMilestones && index === Math.floor(paragraphs.length * 0.75) && (
                <div
                  className="absolute -left-8 top-0"
                  data-milestone="75"
                  aria-label="75% reading progress marker"
                >
                  <Knot size="sm" tone="muted" />
                </div>
              )}
              <p className="mb-6 leading-relaxed text-kdrama-ink dark:text-foreground">
                {paragraph}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
