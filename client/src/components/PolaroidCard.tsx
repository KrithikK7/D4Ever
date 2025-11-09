import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";

interface PolaroidCardProps {
  title: string;
  coverUrl?: string;
  mood?: string | string[];
  tags?: string[];
  description?: string;
  completed?: boolean;
  inProgress?: boolean;
  showBadge?: boolean;
  onClick?: () => void;
}

export function PolaroidCard({
  title,
  coverUrl,
  mood,
  tags = [],
  description,
  completed,
  inProgress,
  showBadge,
  onClick,
}: PolaroidCardProps) {
  const moodList = Array.isArray(mood) ? mood : mood ? [mood] : [];

  return (
    <Card
      className="bg-white dark:bg-card shadow-lg hover:shadow-xl transition-all duration-180 hover:-translate-y-1 hover:animate-sway cursor-pointer border-0 overflow-hidden rounded-2xl relative"
      onClick={onClick}
      data-testid={`card-polaroid-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Progress Badge */}
      {showBadge && (completed || inProgress) && (
        <div className="absolute top-4 right-4 z-10">
          {completed ? (
            <Badge 
              variant="default" 
              className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-md font-noto"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          ) : (
            <Badge 
              variant="default" 
              className="bg-[#f0425c] hover:bg-[#f0425c]/90 text-white border-0 shadow-md font-noto"
            >
              <PlayCircle className="w-3 h-3 mr-1" />
              Resume
            </Badge>
          )}
        </div>
      )}

      <div className="relative">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-kdrama-rose/20 via-kdrama-sakura/30 to-kdrama-lavender/20 flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-[#f0425c]" />
          </div>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <h3 className="font-myeongjo text-lg font-bold text-kdrama-ink dark:text-foreground line-clamp-2">
          {title}
        </h3>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {moodList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {moodList.slice(0, 2).map((m, idx) => (
              <Badge key={`mood-${idx}`} variant="secondary" className="font-noto text-xs">
                {m}
              </Badge>
            ))}
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="font-noto text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {description && (
          <p className="font-noto text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
