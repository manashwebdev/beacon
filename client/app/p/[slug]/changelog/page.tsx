import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { serverFetch } from "@/lib/server";
import { hostOf, safeUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { slug: string } }) {
  const r = await serverFetch(`/api/p/${encodeURIComponent(params.slug)}/changelog`);
  if (r.status === 404) notFound();
  if (!r.ok) throw new Error("Could not load the changelog");
  const { project, items } = await r.json();
  const site = safeUrl(project.website);
  return (
    <>
      <Nav />
      <main className="wrap" style={{ maxWidth: 760 }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href={`/p/${project.slug}`} className="muted" style={{ fontSize: 14 }}>← Back to the board</Link>
          {site && <a className="btn ghost sm" href={site} target="_blank" rel="noopener noreferrer nofollow">Visit {hostOf(site)} ↗</a>}
        </div>
        <h1 className="h1 glowtext" style={{ fontSize: "clamp(30px,5vw,48px)", margin: "8px 0 24px" }}>{project.name} changelog</h1>
        {items.length === 0 && <p className="muted glass" style={{ padding: 24 }}>Nothing has shipped yet. Check back soon.</p>}
        <div style={{ display: "grid", gap: 16 }}>
          {items.map((x: any) => (
            <article key={x.id} className="glass lift" style={{ padding: 20 }}>
              <span className="chip shipped">{new Date(x.shippedAt || x.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              <h2 style={{ margin: "10px 0 6px", fontSize: 20, fontWeight: 600 }}>{x.title}</h2>
              {x.body && <p className="muted" style={{ margin: 0 }}>{x.body}</p>}
              {x.reply && <div className="reply">{x.reply}</div>}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
