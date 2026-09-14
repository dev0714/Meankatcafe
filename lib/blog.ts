// Blog posts. Content is a small markdown subset rendered by lib/markdown.tsx —
// deliberately no markdown dependency, so the build has one less moving part.

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl?: string | null;
  author: string;
  tags: string[];
  published: boolean;
  publishedAt: string;
  sort: number;
};

export const BLOG_COLS =
  "id, slug, title, excerpt, content, cover_path, author, tags, published, published_at, sort, created_at";

export function mapBlogRow(row: Record<string, unknown>, coverUrl: string | null): BlogPost {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    excerpt: (row.excerpt as string) ?? "",
    content: (row.content as string) ?? "",
    coverUrl,
    author: (row.author as string) || "MeanKat Café",
    tags: (row.tags as string[]) ?? [],
    published: Boolean(row.published),
    publishedAt: (row.published_at as string) ?? new Date().toISOString(),
    sort: (row.sort as number) ?? 0,
  };
}

export function formatPostDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/** Rough reading time, for the post header. */
export function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** "durban, guide" -> ["durban","guide"] */
export function parseTags(raw: string): string[] {
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}
