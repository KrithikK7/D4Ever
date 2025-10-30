import { useState } from "react";
import { ThreadBar } from "@/components/ThreadBar";
import { ReadingContent } from "@/components/ReadingContent";
import { FateLinks } from "@/components/FateLinks";
import { ChapterNav } from "@/components/ChapterNav";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function Reader() {
  const [progress, setProgress] = useState(0.35);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mockChapters = [
    { id: "ch1", title: "The Beginning", emoji: "🌸", order: 1, isPublic: true, pageCount: 5 },
    { id: "ch2", title: "Unexpected Encounters", emoji: "☂️", order: 2, isPublic: true, pageCount: 8 },
    { id: "ch3", title: "Growing Closer", emoji: "💜", order: 3, isPublic: true, pageCount: 12 },
  ];

  const mockFateLinks = [
    {
      id: "1",
      title: "Coffee Shop Confessions",
      slug: "coffee-shop",
      tags: ["coffee", "confession", "sweet"],
      mood: "Sweet",
      description: "Words unspoken finally found their way out...",
    },
    {
      id: "2",
      title: "Sunset at Han River",
      slug: "han-river",
      tags: ["sunset", "reflection", "peaceful"],
      mood: "Peaceful",
      description: "Watching the sun set, we talked about everything and nothing...",
    },
    {
      id: "3",
      title: "The Promise",
      slug: "promise",
      tags: ["cherry-blossoms", "spring", "promise"],
      mood: "Hopeful",
      description: "Under the sakura trees, we made a promise...",
    },
  ];

  const mockContent = `Seoul in the spring is a different world. The cherry blossoms paint the city in soft pinks and whites, and everywhere you look, there's a promise of new beginnings.

I didn't expect to meet you that day. The forecast said rain, but I went out anyway, drawn by the last days of the cherry blossom season. You were standing under the biggest tree in Yeouido Park, camera in hand, trying to capture the perfect shot.

When our eyes met, it felt like the world stopped for just a moment. The petals were falling around us like snow, and I remember thinking that this must be what they mean by "destiny."

We talked for hours that day. About everything and nothing. About dreams and fears, about the places we wanted to go and the people we wanted to become. The sun set and we barely noticed, too caught up in our conversation.

Looking back now, I realize that was the moment the red string of fate tied itself around us. From that day forward, our stories became intertwined, our paths forever connected by something greater than either of us could understand.

The days that followed were filled with a kind of magic I'd never experienced before. Every text message made my heart race. Every phone call lasted hours. We discovered shared interests and laughed at inside jokes that only we understood.

It was like finding a missing piece of myself I didn't know was lost.`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-kdrama-cream/30 to-kdrama-sky/20">
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-testid="button-toggle-sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h2 className="font-myeongjo text-xl font-bold text-kdrama-ink dark:text-foreground">
              Under the Cherry Blossoms
            </h2>
            <div className="w-10" />
          </div>
          <ThreadBar
            progress={progress}
            paused={false}
            onMilestone={(m) => console.log(`Milestone: ${m * 100}%`)}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 relative">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        
        <div className={`fixed top-20 left-0 h-full w-80 bg-white dark:bg-card p-6 shadow-xl z-50 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 md:shadow-none md:bg-transparent`}>
          <h3 className="font-myeongjo text-2xl text-kdrama-ink dark:text-foreground mb-6">Chapters</h3>
          <ChapterNav
            chapters={mockChapters}
            activeChapterId="ch2"
            onChapterClick={(id) => console.log(`Navigate to chapter: ${id}`)}
          />
        </div>

        <div className="md:ml-96">
          <ReadingContent
            title="Under the Cherry Blossoms"
            content={mockContent}
            mood="Romantic"
            tags={["spring", "destiny", "first-meeting"]}
            publishedAt={new Date("2024-03-15T14:30:00")}
          />

          <div className="mt-16">
            <FateLinks
              currentPageId="current"
              candidates={mockFateLinks}
              onNavigate={(slug) => console.log(`Navigate to: ${slug}`)}
            />
          </div>

          <div className="mt-12 text-center">
            <Button
              variant="outline"
              onClick={() => setProgress(Math.min(1, progress + 0.1))}
              className="font-noto rounded-2xl"
              data-testid="button-simulate-scroll"
            >
              Simulate Reading Progress
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
