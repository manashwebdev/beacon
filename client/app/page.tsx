import Link from "next/link";
import Nav from "@/components/Nav";
import HeroCTA from "@/components/HeroCTA";
import MockBoard from "@/components/MockBoard";

const STEPS = [
  ["Users post and vote", "Share one link, or add the widget to your site. Anyone can post an idea or upvote without making an account."],
  ["You pick what to build", "Your dashboard ranks ideas by votes. Move each one to Planned or In progress and reply to the people who asked."],
  ["Shipping tells everyone", "Mark an idea Shipped and it appears on your public changelog. The people who asked can see you listened."],
];
const FEATURES = [
  ["Public feedback board", "A clean page at /p/your-project where users post, vote and comment."],
  ["Roadmap you control", "Four columns: Under review, Planned, In progress, Shipped. Change status from a dropdown."],
  ["Automatic changelog", "Shipped ideas become dated release notes with no extra writing."],
  ["Embeddable widget", "One script tag adds a Feedback button to any website."],
  ["Analytics", "Total ideas, votes, 14 days of activity and your top requests."],
  ["Team access", "Invite collaborators as viewers, editors or admins. Everyone sees only what their role allows."],
];
const ROLES = [
  ["Viewer", "Read the dashboard and analytics"],
  ["Editor", "Also change status, reply and comment as the team"],
  ["Admin", "Also delete ideas and manage editors and viewers"],
  ["Owner", "Also manage admins and delete the project"],
];
const SECURITY = [
  "Passwords are hashed with bcrypt and never stored in plain text.",
  "Sessions use httpOnly cookies that scripts cannot read.",
  "Accounts lock for 15 minutes after repeated wrong passwords.",
  "Change your password or sign out of all devices at any time.",
  "Every dashboard action is checked against your role on the server.",
];
const FAQ = [
  ["Do my users need an account?", "No. Visitors can post, vote and comment without signing up. Only you and your team need accounts."],
  ["Who can see my dashboard?", "Only people you add to the project. The public board and changelog are the only public pages."],
  ["Is it free?", "Beacon is open source. Run your own copy on the free tiers of Vercel and MongoDB Atlas."],
  ["Can I add a teammate?", "Yes. Add anyone who has a Beacon account by email and choose their role."],
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="wrap" style={{ paddingTop: 120 }}>
        <section className="hero">
          <div style={{ flex: 1.2, minWidth: 280 }}>
            <h1 className="h1 glowtext">Hear what your users want. Build it. Tell them it shipped.</h1>
            <p className="muted" style={{ fontSize: 19, maxWidth: 540, margin: "20px 0 28px", lineHeight: 1.5 }}>
              Beacon gives every project a feedback board, a roadmap and a changelog. Built for developers who work alone or in a small team.
            </p>
            <div className="flex gap-3 flex-wrap"><HeroCTA /></div>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 280 }}><MockBoard /></div>
        </section>

        <section className="sec">
          <h2 className="h2">How it works</h2>
          <div className="grid3">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="glass lift" style={{ padding: 22 }}>
                <span className="chip">Step {i + 1}</span>
                <h3 style={{ margin: "12px 0 8px", fontWeight: 600, fontSize: 20 }}>{t}</h3>
                <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sec">
          <h2 className="h2">Everything in one place</h2>
          <div className="grid3">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="glass lift" style={{ padding: 22 }}>
                <h3 style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 18 }}>{t}</h3>
                <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sec">
          <h2 className="h2">Accounts, teams and security</h2>
          <div className="two">
            <div className="glass" style={{ padding: 22 }}>
              <h3 style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 18 }}>What each role can do</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {ROLES.map(([r, d]) => (
                  <div key={r} className="flex gap-3 items-start"><span className="chip planned" style={{ minWidth: 64, textAlign: "center" }}>{r}</span><span className="muted">{d}</span></div>
                ))}
              </div>
            </div>
            <div className="glass" style={{ padding: 22 }}>
              <h3 style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 18 }}>How your account is protected</h3>
              <ul className="muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, lineHeight: 1.5 }}>
                {SECURITY.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="sec" style={{ maxWidth: 760 }}>
          <h2 className="h2">Questions</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {FAQ.map(([q, a]) => (
              <details key={q} className="glass faq"><summary>{q}</summary><p className="muted" style={{ margin: "10px 0 0", lineHeight: 1.55 }}>{a}</p></details>
            ))}
          </div>
        </section>

        <section className="sec glass" style={{ padding: "44px 24px", textAlign: "center" }}>
          <h2 className="h2" style={{ marginBottom: 10 }}>Start listening to your users today</h2>
          <p className="muted" style={{ margin: "0 0 22px" }}>Create an account, add a project, and share your board link in a minute.</p>
          <div className="flex gap-3 flex-wrap justify-center"><HeroCTA label="Create your account" /></div>
        </section>

        <footer className="muted" style={{ marginTop: 50, textAlign: "center", fontSize: 14 }}>
          Beacon is open source. <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link> or <Link href="/signup" style={{ color: "var(--accent)" }}>sign up</Link>.
        </footer>
      </main>
    </>
  );
}
