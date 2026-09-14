import React from "react";
import Link from "next/link";

// A deliberately small markdown subset: ## headings, - bullets, 1. numbered
// lists, **bold**, and [links](/path). Enough for the guides, and it keeps a
// markdown parser out of the dependency tree.

/** Inline formatting: **bold** and [text](href). */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on links first, then handle bold inside each piece.
  const linkRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  const pushBold = (chunk: string, kp: string) => {
    const parts = chunk.split(/\*\*(.+?)\*\*/g);
    parts.forEach((part, idx) => {
      if (!part) return;
      if (idx % 2 === 1) nodes.push(<strong key={`${kp}-b${idx}`}>{part}</strong>);
      else nodes.push(<React.Fragment key={`${kp}-t${idx}`}>{part}</React.Fragment>);
    });
  };

  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) pushBold(text.slice(last, m.index), `${keyPrefix}-p${i}`);
    const [, label, href] = m;
    const external = /^https?:\/\//.test(href);
    nodes.push(
      external ? (
        <a key={`${keyPrefix}-l${i}`} href={href} target="_blank" rel="noopener">{label}</a>
      ) : (
        <Link key={`${keyPrefix}-l${i}`} href={href}>{label}</Link>
      ),
    );
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) pushBold(text.slice(last), `${keyPrefix}-p${i}`);
  return nodes;
}

export function renderMarkdown(source: string): React.ReactNode[] {
  const lines = (source ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let para: string[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(" ").trim();
    if (text) out.push(<p key={`p${key++}`}>{renderInline(text, `p${key}`)}</p>);
    para = [];
  };
  const flushBullets = () => {
    if (!bullets.length) return;
    out.push(
      <ul key={`u${key++}`}>
        {bullets.map((b, i) => <li key={i}>{renderInline(b, `u${key}-${i}`)}</li>)}
      </ul>,
    );
    bullets = [];
  };
  const flushNumbers = () => {
    if (!numbers.length) return;
    out.push(
      <ol key={`o${key++}`}>
        {numbers.map((b, i) => <li key={i}>{renderInline(b, `o${key}-${i}`)}</li>)}
      </ol>,
    );
    numbers = [];
  };
  const flushAll = () => { flushPara(); flushBullets(); flushNumbers(); };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushAll(); continue; }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const text = heading[2];
      if (heading[1].length === 2) out.push(<h2 key={`h${key++}`}>{renderInline(text, `h${key}`)}</h2>);
      else out.push(<h3 key={`h${key++}`}>{renderInline(text, `h${key}`)}</h3>);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) { flushPara(); flushNumbers(); bullets.push(bullet[1]); continue; }

    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (numbered) { flushPara(); flushBullets(); numbers.push(numbered[1]); continue; }

    flushBullets(); flushNumbers();
    para.push(line.trim());
  }
  flushAll();
  return out;
}
