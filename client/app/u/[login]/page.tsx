import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { serverFetch } from "@/lib/server";
import { hostOf, safeUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { login: string } }) {
  return { title: `${params.login} on Beacon: projects and feedback` };
}

const month = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "");

export default async function Page({ params }: { params: { login: string } }) {
  const r = await serverFetch(`/api/u/${encodeURIComponent(params.login)}`);
  if (r.status === 404) notFound();
  if (!r.ok) throw new Error("Could not load this profile");
  const { profile, repos } = await r.json();
  const avatar = safeUrl(profile.avatar);

  return (
    <>
      <Nav />
      <main className="wrap">
        <header className="glass" style={{ padding: 24, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          {avatar && <img className="avatar lg" src={avatar} alt="" />}
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 className="h1 glowtext" style={{ fontSize: "clamp(28px,5vw,44px)" }}>{profile.name || profile.handle}</h1>
            <a className="muted" href={`https://github.com/${profile.handle}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15 }}>@{profile.handle} on GitHub ↗</a>
            {profile.bio && <p style={{ margin: "10px 0 0" }}>{profile.bio}</p>}
          </div>
          <span className="chip">{repos.length} {repos.length === 1 ? "project" : "projects"}</span>
        </header>

        {repos.length === 0 && <p className="muted glass" style={{ padding: 24, marginTop: 20 }}>No projects are public yet. Check back soon.</p>}

        <div style={{ display: "grid", gap: 16, marginTop: 20, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {repos.map((x: any) => {
            const code = safeUrl(x.url);
            const site = safeUrl(x.homepage);
            return (
              <article key={x.id} className="glass lift" style={{ padding: 20, display: "grid", gap: 10, alignContent: "start" }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{x.name}</h2>
                  {x.isPrivate && <span className="chip warn">Private</span>}
                  {x.isFork && <span className="chip">Fork</span>}
                </div>
                {x.description && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{x.description}</p>}
                {x.topics.length > 0 && <div className="flex gap-2 flex-wrap">{x.topics.slice(0, 5).map((t: string) => <span key={t} className="chip">{t}</span>)}</div>}
                <div className="muted" style={{ fontSize: 13, display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {x.language && <span>{x.language}</span>}
                  <span>★ {x.stars}</span>
                  {x.pushedAt && <span>Updated {month(x.pushedAt)}</span>}
                </div>
                <div className="flex gap-2 flex-wrap" style={{ marginTop: 4 }}>
                  {site && <a className="btn sm" href={site} target="_blank" rel="noopener noreferrer nofollow">Visit {hostOf(site)} ↗</a>}
                  {code && <a className="btn ghost sm" href={code} target="_blank" rel="noopener noreferrer">View code</a>}
                  {x.board && <Link className="btn ghost sm" href={`/p/${x.board}`}>Give feedback</Link>}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}
