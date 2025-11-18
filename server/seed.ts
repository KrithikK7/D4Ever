import './bootstrap-env';
import bcrypt from "bcrypt";
import { storage } from "./storage";

async function seed() {
  try {
    console.log("Seeding database...");

    const requireEnv = (name: string) => {
      const value = process.env[name];
      if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
      }
      return value;
    };

    const requireStrongPassword = (name: string, value: string) => {
      if (value.length < 12) {
        throw new Error(`${name} must be at least 12 characters long`);
      }
      if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
        throw new Error(`${name} must include upper, lower case letters and numbers`);
      }
    };

    const adminUsername = requireEnv("SEED_ADMIN_USERNAME");
    const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");
    const readerUsername = requireEnv("SEED_READER_USERNAME");
    const readerPassword = requireEnv("SEED_READER_PASSWORD");

    requireStrongPassword("SEED_ADMIN_PASSWORD", adminPassword);
    requireStrongPassword("SEED_READER_PASSWORD", readerPassword);

    // Create admin user
    const existingAdmin = await storage.getUserByUsername(adminUsername);
    if (!existingAdmin) {
      const adminUser = await storage.createUser({
        username: adminUsername,
        password: await bcrypt.hash(adminPassword, 10),
        role: "admin",
      });
      console.log("Created admin user:", adminUser.username);
    } else {
      console.log("Admin user already exists, skipping creation");
    }

    // Create reader user for testing
    const existingReader = await storage.getUserByUsername(readerUsername);
    if (!existingReader) {
      const readerUser = await storage.createUser({
        username: readerUsername,
        password: await bcrypt.hash(readerPassword, 10),
        role: "reader",
      });
      console.log("Created reader user:", readerUser.username);
    } else {
      console.log("Reader user already exists, skipping creation");
    }

    // Create Chapter 1: Spring Destiny
    const chapter1 = await storage.createChapter({
      title: "Spring Destiny",
      description: "The beginning of our story under the cherry blossoms",
      songUrl: "https://open.spotify.com/track/0JiW8BRZONMh9BwQ4jZGbJ",
      order: 1,
    });

    // Create sections for Chapter 1
    const section1 = await storage.createSection({
      chapterId: chapter1.id,
      title: "Under the Cherry Blossoms",
      mood: ["Romantic"],
      tags: ["spring", "first-meeting", "destiny"],
      songUrl: "https://open.spotify.com/track/5K4W6rqBFWDnAN6FQUkS6x",
      order: 1,
      publishedAt: new Date(),
      publishedDateManual: false,
    });

    const section2 = await storage.createSection({
      chapterId: chapter1.id,
      title: "The Coffee Shop Promise",
      mood: ["Hopeful"],
      tags: ["cafe", "promise", "beginning"],
      songUrl: "https://open.spotify.com/track/2FDTHlrBguDzQod7tMcvsp",
      order: 2,
      publishedAt: new Date(),
      publishedDateManual: false,
    });

    // Create pages for section 1
    await storage.createPage({
      sectionId: section1.id,
      content: `Seoul in the spring is a different world. The cherry blossoms paint the city in soft pinks and whites, and everywhere you look, there's a promise of new beginnings.

I didn't expect to meet you that day. The forecast said rain, but I went out anyway, drawn by the last day of cherry blossom season at Yeouido Park.

The petals were falling like snow, and I was trying to capture the perfect photo when my camera slipped from my hands. Before it could hit the ground, you caught it.

"Careful," you said, smiling. "These moments are too precious to drop."

That's when I first saw your eyes – warm, kind, and somehow familiar, as if I'd known them in another lifetime.

They say there's a red thread connecting those who are destined to meet. In that moment, under the falling petals, I felt it pull tight between us.`,
      pageNumber: 1,
    });

    await storage.createPage({
      sectionId: section1.id,
      content: `"Thank you," I managed to say, my heart beating faster than it should from a simple act of kindness.

"I'm here doing the same thing," you said, showing me your own camera. "Trying to hold onto spring before it's gone."

We walked together that afternoon, comparing photos, talking about nothing and everything. You told me about your work as a photographer, how you chase light and moments. I told you about my writing, how I try to capture feelings in words.

When the rain finally came, we stood under a single umbrella, watching the last petals wash away down the street.

"I feel like I've been waiting to meet you," you said quietly.

"Me too," I whispered back, and I meant it with every fiber of my being.

That was the beginning. Our red thread had found its match.`,
      pageNumber: 2,
    });

    // Create pages for section 2
    await storage.createPage({
      sectionId: section2.id,
      content: `The café became our place. Every Sunday at 2 PM, without fail, we'd meet at the corner table by the window.

"Same order?" the barista would ask, already knowing the answer. Two americanos, one croissant to share.

You'd show me the photos from your week – street scenes, landscapes, faces that told stories. I'd read you passages from whatever I was working on, watching your reactions to gauge if the words landed right.

"You capture time," I told you once. "I capture feelings."

"Maybe together we capture life," you said, and that's when you made the promise.`,
      pageNumber: 1,
    });

    await storage.createPage({
      sectionId: section2.id,
      content: `"Let's make a promise," you said, pulling out your camera. "Every important moment, we document it. Your words, my photos. We'll create our own archive of this love."

Love. That was the first time either of us had said it out loud.

"Yes," I agreed, feeling the red thread between us pull tighter, more visible, more real.

You took a photo of us in the café window, the spring light filtering through, our reflections overlapping with the Seoul street behind us.

"The first entry in our archive," you said, and kissed my forehead.

I wrote three words in my notebook: "Spring. Destiny. Forever."

The promise was made. The thread was tied. And our story continued to unfold, one moment at a time.`,
      pageNumber: 2,
    });

    // Create Chapter 2: Summer Adventures
    const chapter2 = await storage.createChapter({
      title: "Summer Adventures",
      description: "Exploring the city together in the golden summer light",
      songUrl: "https://open.spotify.com/track/6hOz5sVQXeKgLePPN0LVZP",
      order: 2,
    });

    const section3 = await storage.createSection({
      chapterId: chapter2.id,
      title: "Han River Nights",
      mood: ["Peaceful"],
      tags: ["summer", "han-river", "memories"],
      songUrl: "https://open.spotify.com/track/5fVZC9GiM4e8vu99W0Xf6J",
      order: 1,
      publishedAt: new Date(),
      publishedDateManual: false,
    });

    await storage.createPage({
      sectionId: section3.id,
      content: `Summer in Seoul brought a different kind of magic. The humid air carried the sounds of cicadas and laughter from the Han River parks.

Every Friday night, we'd ride our bikes along the river path, watching the city lights reflect on the water. You'd bring your camera, always ready to capture the golden hour.

"Look," you'd say, pointing at the way the sunset painted the bridges. "This is why I love photography. How it freezes these fleeting moments."

We'd stop at the convenience store, buying cold drinks and kimbap, finding our spot on the grass. Other couples surrounded us, but in those moments, we had our own universe.

The red thread that connected us seemed to glow brighter in the summer twilight.`,
      pageNumber: 1,
    });

    // Create Chapter 3: Autumn Reflections
    const chapter3 = await storage.createChapter({
      title: "Autumn Reflections",
      description: "The changing seasons mirror the changes in our hearts",
      songUrl: "https://open.spotify.com/track/0tgVpDi06FyKpA1z0VMD4v",
      order: 3,
    });

    const section4 = await storage.createSection({
      chapterId: chapter3.id,
      title: "Golden Leaves and Memories",
      mood: ["Nostalgic"],
      tags: ["autumn", "reflection", "photography"],
      songUrl: "https://open.spotify.com/track/1QY7OuUCxVBZCaNplxEpZg",
      order: 1,
      publishedAt: new Date(),
      publishedDateManual: false,
    });

    await storage.createPage({
      sectionId: section4.id,
      content: `Autumn arrived quietly in Seoul. The ginkgo trees lining the streets began their transformation into gold, and the air carried a crispness that reminded us of time passing.

We spent that October afternoon in Nami Island, walking among the metasequoia trees. The path was covered in fallen leaves, creating a carpet of amber and gold.

"This is my favorite season," you said, raising your camera to capture the dappled sunlight filtering through the canopy. "Everything is beautiful but temporary. Just like these moments we're capturing."

[embed:https://images.unsplash.com/photo-1541339907-f89f0be0e2ac]

I held your hand tighter, understanding the weight of those words. Our archive was growing, each photo and journal entry a thread in the tapestry of our shared story.`,
      pageNumber: 1,
    });

    await storage.createPage({
      sectionId: section4.id,
      content: `"Look at this," you said, showing me your camera screen. It was us, reflected in a puddle, surrounded by fallen leaves. "Beautiful imperfection."

We stopped at a café overlooking the river, ordering hot chocolates and watching other couples pose for photos under the autumn trees.

"Remember when we first met?" I asked. "Under the cherry blossoms in spring?"

"How could I forget?" you smiled. "We've been through spring, summer, and now autumn together."

[embed:https://images.unsplash.com/photo-1544251451-6752e8687e4a]

"And we'll see winter together too," I said, adding another page to my journal. The red thread between us felt stronger than ever, woven through the seasons.`,
      pageNumber: 2,
    });

    // Create Chapter 4: Winter Warmth
    const chapter4 = await storage.createChapter({
      title: "Winter Warmth",
      description: "Finding warmth in each other during the coldest season",
      songUrl: "https://open.spotify.com/track/3RiPr603aXAoi4GHyXx0uy",
      order: 4,
    });

    const section5 = await storage.createSection({
      chapterId: chapter4.id,
      title: "First Snow",
      mood: ["Magical"],
      tags: ["winter", "snow", "romance"],
      songUrl: "https://open.spotify.com/track/40riOy7x9W7GXjyGp4pjAv",
      order: 1,
      publishedAt: new Date(),
      publishedDateManual: false,
    });

    await storage.createPage({
      sectionId: section5.id,
      content: `They say the first snow of winter is magical in Korea. If you see it with someone special, your love will last forever.

I was at home when you called. "Look outside," you said breathlessly.

I pulled back the curtain to see soft, white flakes drifting down from the dark sky. The streetlights illuminated each snowflake like tiny stars falling to earth.

"I'm coming over," you said. "We need to see this together."

Twenty minutes later, you were at my door, snowflakes caught in your hair, your camera around your neck, and that familiar smile on your face.

"Come on," you said, taking my hand. "Let's catch the first snow."`,
      pageNumber: 1,
    });

    await storage.createPage({
      sectionId: section5.id,
      content: `We stood in the empty park, faces turned up to the sky, watching the snow fall. You took photos while I described the feeling in words only I could articulate.

"It's like the universe is blessing us," I said softly.

[embed:https://images.unsplash.com/photo-1482164565953-04b62dcac1cd]

"The first snow with you," you whispered, setting down your camera to hold both my hands. "This moment, right now, is everything."

Around us, Seoul was transforming into a winter wonderland. But all I could see was you, the red thread between us glowing brighter in the falling snow.

"Forever," I promised.

"Forever," you echoed.`,
      pageNumber: 2,
    });

    const section6 = await storage.createSection({
      chapterId: chapter4.id,
      title: "Holiday Market Adventures",
      mood: ["Joyful"],
      tags: ["winter", "market", "celebration"],
      songUrl: "https://open.spotify.com/track/2aJDlirz6v2a4HREki98cP",
      order: 2,
      publishedAt: new Date(),
      publishedDateManual: false,
    });

    await storage.createPage({
      sectionId: section6.id,
      content: `December brought the holiday markets to Seoul. Myeongdong was transformed into a wonderland of lights, street food vendors, and festive music.

We bundled up in matching scarves (your idea, not mine, but I secretly loved it) and dove into the crowds. Your camera was busy capturing everything: the glowing decorations, the steaming tteokbokki stands, children laughing over roasted chestnuts.

"Try this," you said, offering me a cup of hot cinnamon tea. "Perfect for a cold night."

We wandered through the stalls, your hand warm in mine despite the freezing temperature.

[embed:https://images.unsplash.com/photo-1513094735237-8f2714d57c13]

"Look," you pointed to a stall selling red thread bracelets. "Like our red thread of fate."

We bought two matching bracelets, tying them around each other's wrists with promises whispered between the knots.`,
      pageNumber: 1,
    });

    await storage.createPage({
      sectionId: section6.id,
      content: `As the evening grew later, we found ourselves on a quiet street away from the crowds. The Christmas lights created a magical canopy above us.

"You know what I love most about winter?" you asked, pulling me close.

"What?"

"It gives me an excuse to hold you closer."

I laughed, wrapping my arms around you. "You don't need an excuse."

[embed:https://images.unsplash.com/photo-1512389142860-9c449e58a543]

We took a selfie there, under the lights, our smiles bright and our hearts full. Another entry in our ever-growing archive of love.

"This has been the best year," I said.

"It's only the beginning," you replied. "We have so many more seasons together."

And I believed you, with every fiber of my being.`,
      pageNumber: 2,
    });

    // Create Chapter 5: Special Moments
    const chapter5 = await storage.createChapter({
      title: "Special Moments",
      description: "The unforgettable experiences that define our journey",
      songUrl: "https://open.spotify.com/track/0u2P5u6lvoDfwTYjAADbn4",
      order: 5,
    });

    const section7 = await storage.createSection({
      chapterId: chapter5.id,
      title: "The Rooftop Concert",
      mood: ["Exciting"],
      tags: ["music", "concert", "celebration"],
      songUrl: "https://open.spotify.com/track/5K4W6rqBFWDnAN6FQUkS6x",
      order: 1,
      publishedAt: new Date(),
      publishedDateManual: false,
    });

    await storage.createPage({
      sectionId: section7.id,
      content: `You surprised me with tickets to a rooftop concert in Hongdae. I didn't even know how you managed to get them – they were sold out within minutes of release.

"I have my ways," you said with that mischievous smile I'd grown to love.

The venue was intimate, maybe a hundred people maximum, with the Seoul skyline as our backdrop. The indie band played acoustic versions of popular K-drama OSTs, and every song felt like it was written about us.

[embed:https://images.unsplash.com/photo-1514525253161-7a46d19cd819]

"This is incredible," I whispered during a soft ballad, leaning against you.

"I wanted to give you a night you'd never forget," you said, kissing the top of my head.

Mission accomplished.`,
      pageNumber: 1,
    });

    await storage.createPage({
      sectionId: section7.id,
      content: `As the final song played, the lead singer dedicated it to "all the lovers finding their way to each other tonight."

You stood, offering your hand. "Dance with me?"

Right there, on that rooftop under the stars, we swayed to the music. Other couples joined in, but it felt like we were the only two people in the world.

[embed:https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3]

"Thank you for this," I said.

"Thank you for being exactly who you are," you replied.

The red thread between us pulsed with every heartbeat, binding us tighter with each passing moment.

I knew then that this wasn't just a relationship. This was destiny, written in the stars, sealed by fate, and captured forever in our archive.`,
      pageNumber: 2,
    });

    // Add a section with Instagram gallery content to demonstrate the new feature
    const section8 = await storage.createSection({
      chapterId: chapter3.id,
      title: "Behind the Scenes",
      mood: ["Social", "Fun"],
      tags: ["instagram", "behind-the-scenes", "memories"],
      order: 4,
      publishedAt: new Date(),
      publishedDateManual: false,
    });

    await storage.createPage({
      sectionId: section8.id,
      content: `Sometimes the best memories are the ones we share in real-time. Here are some moments from our Seoul adventures that we captured for Instagram.

Our favorite cafe in Gangnam where we spent countless afternoons:
[instagram-gallery:https://www.instagram.com/p/C3LZuNOPQx5/,https://www.instagram.com/reel/C9HQoUJp0c5/,https://www.instagram.com/p/C2kZ_NvOQx5/]

The aesthetic really matched our mood that day - soft pastels and warm lighting, just like in our favorite drama scenes.`,
      pageNumber: 1,
    });

    await storage.createPage({
      sectionId: section8.id,
      content: `The cooking class where you finally mastered making kimchi jjigae:

[instagram-gallery:https://www.instagram.com/p/C8kZ_NvOQx5/,https://www.instagram.com/reel/C7HQoUJp0c5/]

Your proud smile when the instructor complimented your technique was everything. I still have that video saved on my phone.`,
      pageNumber: 2,
    });

    await storage.createPage({
      sectionId: section8.id,
      content: `A single moment that captured everything:

[embed:https://www.instagram.com/p/C5LZuNOPQx5/]

Sometimes one image says more than a thousand words could ever express.`,
      pageNumber: 3,
    });

    // Get all pages for creating analytics and reading progress
    const section1Pages = await storage.getPagesBySection(section1.id);
    const section2Pages = await storage.getPagesBySection(section2.id);
    const section3Pages = await storage.getPagesBySection(section3.id);
    const section4Pages = await storage.getPagesBySection(section4.id);
    const section5Pages = await storage.getPagesBySection(section5.id);
    const section6Pages = await storage.getPagesBySection(section6.id);
    const section7Pages = await storage.getPagesBySection(section7.id);
    const section8Pages = await storage.getPagesBySection(section8.id);

    // Create sample analytics events for reader user
    console.log("Creating sample analytics events...");
    
    // Reader viewed section 1 - spent time reading
    if (section1Pages.length > 0) {
      await storage.createAnalyticsEvent({
        userId: readerUser.id,
        pageId: section1Pages[0].id,
        sectionId: section1.id,
        chapterId: chapter1.id,
        eventType: "page_view",
        duration: 45000, // 45 seconds
      });
      
      if (section1Pages.length > 1) {
        await storage.createAnalyticsEvent({
          userId: readerUser.id,
          pageId: section1Pages[1].id,
          sectionId: section1.id,
          chapterId: chapter1.id,
          eventType: "page_view",
          duration: 62000, // 1 minute 2 seconds
        });
      }
    }

    // Reader viewed section 2
    if (section2Pages.length > 0) {
      await storage.createAnalyticsEvent({
        userId: readerUser.id,
        pageId: section2Pages[0].id,
        sectionId: section2.id,
        chapterId: chapter1.id,
        eventType: "page_view",
        duration: 38000,
      });
    }

    // Reader viewed section 3
    if (section3Pages.length > 0) {
      await storage.createAnalyticsEvent({
        userId: readerUser.id,
        pageId: section3Pages[0].id,
        sectionId: section3.id,
        chapterId: chapter2.id,
        eventType: "page_view",
        duration: 55000,
      });
    }

    // Admin viewed multiple sections for content review
    if (section1Pages.length > 0) {
      await storage.createAnalyticsEvent({
        userId: adminUser.id,
        pageId: section1Pages[0].id,
        sectionId: section1.id,
        chapterId: chapter1.id,
        eventType: "page_view",
        duration: 25000,
      });
    }

    if (section4Pages.length > 0) {
      await storage.createAnalyticsEvent({
        userId: adminUser.id,
        pageId: section4Pages[0].id,
        sectionId: section4.id,
        chapterId: chapter3.id,
        eventType: "page_view",
        duration: 42000,
      });
    }

    if (section5Pages.length > 0) {
      await storage.createAnalyticsEvent({
        userId: adminUser.id,
        pageId: section5Pages[0].id,
        sectionId: section5.id,
        chapterId: chapter4.id,
        eventType: "page_view",
        duration: 51000,
      });
    }

    // Create sample reading progress
    console.log("Creating sample reading progress...");
    
    // Reader has completed section 1
    await storage.upsertReadingProgress({
      userId: readerUser.id,
      sectionId: section1.id,
      pageId: section1Pages[section1Pages.length - 1]?.id,
      currentPageNumber: section1Pages.length,
      completed: true,
    });

    // Reader is in the middle of section 2
    if (section2Pages.length > 0) {
      await storage.upsertReadingProgress({
        userId: readerUser.id,
        sectionId: section2.id,
        pageId: section2Pages[0].id,
        currentPageNumber: 1,
        completed: false,
      });
    }

    // Reader has started section 3
    if (section3Pages.length > 0) {
      await storage.upsertReadingProgress({
        userId: readerUser.id,
        sectionId: section3.id,
        pageId: section3Pages[0].id,
        currentPageNumber: 1,
        completed: false,
      });
    }

    // Admin has reviewed section 4
    if (section4Pages.length > 0) {
      await storage.upsertReadingProgress({
        userId: adminUser.id,
        sectionId: section4.id,
        pageId: section4Pages[0].id,
        currentPageNumber: 1,
        completed: false,
      });
    }

    // Admin has reviewed section 5
    if (section5Pages.length > 0) {
      await storage.upsertReadingProgress({
        userId: adminUser.id,
        sectionId: section5.id,
        pageId: section5Pages[0].id,
        currentPageNumber: 1,
        completed: false,
      });
    }

    console.log("Database seeded successfully!");
    console.log("\n✨ K-Drama Journal is ready to use! ✨");
    console.log("\n📝 Login credentials were sourced from environment variables:");
    console.log(`  Admin username: ${adminUsername}`);
    console.log("  Admin password: [value from SEED_ADMIN_PASSWORD]");
    console.log(`  Reader username: ${readerUsername}`);
    console.log("  Reader password: [value from SEED_READER_PASSWORD]");
    console.log("\n✅ Sample data includes:");
    console.log("   • 5 Chapters covering all seasons");
    console.log("   • 7 Sections with unique moods and themes");
    console.log("   • Multiple pages with embedded images");
    console.log("   • K-Drama OST Spotify links for chapters and sections");
    console.log("   • Sample analytics events (7 page views with durations)");
    console.log("   • Reading progress data for both users");
    console.log("   • K-Drama inspired content and aesthetics");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seed();
