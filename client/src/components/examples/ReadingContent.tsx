import { ReadingContent } from "../ReadingContent";

export default function ReadingContentExample() {
  const mockContent = `Seoul in the spring is a different world. The cherry blossoms paint the city in soft pinks and whites, and everywhere you look, there's a promise of new beginnings.

I didn't expect to meet you that day. The forecast said rain, but I went out anyway, drawn by the last days of the cherry blossom season. You were standing under the biggest tree in Yeouido Park, camera in hand, trying to capture the perfect shot.

When our eyes met, it felt like the world stopped for just a moment. The petals were falling around us like snow, and I remember thinking that this must be what they mean by "destiny."

We talked for hours that day. About everything and nothing. About dreams and fears, about the places we wanted to go and the people we wanted to become. The sun set and we barely noticed, too caught up in our conversation.

Looking back now, I realize that was the moment the red string of fate tied itself around us. From that day forward, our stories became intertwined, our paths forever connected by something greater than either of us could understand.`;

  return (
    <div className="p-8 bg-gradient-to-b from-kdrama-cream/30 to-kdrama-sky/30 min-h-screen">
      <ReadingContent
        title="Under the Cherry Blossoms"
        content={mockContent}
        mood="Romantic"
        tags={["spring", "destiny", "first-meeting"]}
        publishedAt={new Date("2024-03-15T14:30:00")}
      />
    </div>
  );
}
