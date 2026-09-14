import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPosts } from "@/lib/blog-server";
import { formatPostDate, readingMinutes } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { SiteChrome } from "../../site-chrome";
import "../../meankat.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      url: `${SITE_URL}/blog/${post.slug}`,
      ...(post.coverUrl ? { images: [{ url: post.coverUrl, alt: post.title }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const others = (await getPosts()).filter((p) => p.slug !== post.slug).slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
    ...(post.coverUrl ? { image: post.coverUrl } : {}),
    keywords: post.tags.join(", "),
  };

  return (
    <SiteChrome page="Guides">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="page-header">
        <div className="paws-layer" />
        <div className="page-header-inner">
          <div className="page-script">MeanKat</div>
          <div className="page-title" style={{ fontSize: "clamp(30px, 5vw, 54px)" }}>Guides</div>
        </div>
      </section>

      <article className="post">
        <div className="post-inner">
          <Link href="/blog" className="back-link">← All guides</Link>
          <h1 className="post-title">{post.title}</h1>
          <div className="post-meta">
            {formatPostDate(post.publishedAt)} · {readingMinutes(post.content)} min read
          </div>
          {post.coverUrl && <img className="post-cover" src={post.coverUrl} alt={post.title} />}
          <div className="post-body">{renderMarkdown(post.content)}</div>

          {post.tags.length > 0 && (
            <div className="post-tags">
              {post.tags.map((t) => <span className="post-tag" key={t}>{t}</span>)}
            </div>
          )}

          <div className="post-cta">
            <div className="post-cta-h">Come and meet the cats</div>
            <p className="post-cta-p">
              Every visit funds food, vet care and fostering for Durban&apos;s rescue cats.
            </p>
            <Link href="/book" className="btn btn-purple">Book a Visit</Link>
          </div>

          {others.length > 0 && (
            <div className="post-more">
              <div className="post-more-h">Keep reading</div>
              <div className="post-more-grid">
                {others.map((p) => (
                  <Link key={p.id} href={`/blog/${p.slug}`} className="post-more-card">
                    <div className="post-more-title">{p.title}</div>
                    <div className="post-more-excerpt">{p.excerpt}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </SiteChrome>
  );
}
