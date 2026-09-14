import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/blog-server";
import { formatPostDate, readingMinutes } from "@/lib/blog";
import { SiteChrome } from "../site-chrome";
import "../meankat.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guides & Stories",
  description:
    "Guides to Durban and life at the café — things to do in the city, what to expect on your first cat café visit, and how adopting a rescue cat really works.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex() {
  const posts = await getPosts();

  return (
    <SiteChrome page="Blog">
      <section className="page-header">
        <div className="paws-layer" />
        <div className="page-header-inner">
          <div className="page-script">Guides and</div>
          <h1 className="page-title">Stories</h1>
          <p className="page-sub">
            Durban guides, cat café know-how and honest answers about adopting a rescue cat.
          </p>
        </div>
      </section>

      <section className="blog-list">
        <div className="blog-list-inner">
          {posts.length === 0 ? (
            <p className="blog-empty">No posts yet — check back soon.</p>
          ) : (
            posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card">
                {post.coverUrl && <img className="blog-card-img" src={post.coverUrl} alt={post.title} />}
                <div className="blog-card-body">
                  <div className="blog-card-meta">
                    {formatPostDate(post.publishedAt)} · {readingMinutes(post.content)} min read
                  </div>
                  <h2 className="blog-card-title">{post.title}</h2>
                  <p className="blog-card-excerpt">{post.excerpt}</p>
                  <span className="blog-card-more">Read more →</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </SiteChrome>
  );
}
