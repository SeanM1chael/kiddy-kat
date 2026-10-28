// =====================================================================
// kiddy-push — sends Kiddy Kat alerts to phones and Chromebooks
// The app says WHAT happened (a kind like "reward" plus a short detail).
// This function writes the words itself, so nobody can send made-up messages,
// and the database decides who is allowed to alert whom.
// Secrets it needs (Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (like mailto:you@example.com)
// =====================================================================
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Who an alert of each kind goes to, its title (what kind of alert) and its words.
// d = the short detail, f = who it's from.
const stars = (d: string) => (d === "1" ? "1 star" : `${d || "some"} stars`);
const KINDS: Record<string, { to: "parents" | "kid"; title: string; words: (f: string, d: string) => string }> = {
  reward:   { to: "parents", title: "🎁 Reward request", words: (f, d) => `${f} asked for ${d || "a reward"}` },
  job:      { to: "parents", title: "💵 Job to check", words: (f, d) => `${f} did a job: ${d || "extra job"}. Check and pay?` },
  catchup:  { to: "parents", title: "📚 Catch-up turned in", words: (f, d) => `${f} turned in ${d || "a catch-up assignment"}` },
  photo:    { to: "parents", title: "📸 Schoolwork to check", words: (f) => `${f} sent schoolwork to check` },
  yes:      { to: "kid", title: "🎉 It's a YES!", words: (f, d) => `${f} said YES to ${d || "your reward"}!` },
  no:       { to: "kid", title: "🎁 Reward", words: (_f, d) => `${d || "Your reward"}: not this time. Your stars are back.` },
  paid:     { to: "kid", title: "💵 You got paid!", words: (f, d) => `${f} paid you${d ? " for " + d : ""}!` },
  stars:    { to: "kid", title: "⭐ Star gift", words: (f, d) => `${f} sent you ${stars(d)}!` },
  kindness: { to: "kid", title: "💛 Kindness star", words: (f) => `${f} sent you a kindness star!` },
  pack:     { to: "kid", title: "🧠 New practice pack", words: (_f, d) => `${d || "A new pack"} is ready in 🎮 Practice!` },
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// Short, single-line, no odd characters
function clean(text: unknown, max = 40) {
  return String(text ?? "").replace(/[\r\n\t<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "Use POST" }, 405);
  const body = await req.json().catch(() => ({}));
  const kind = KINDS[body.kind];
  if (!kind) return reply({ error: "Unknown kind of alert" }, 400);
  if (!body.token) return reply({ error: "Please log in" }, 403);

  const to = kind.to === "parents" ? "parents" : `kid:${clean(body.kid, 30)}`;
  if (kind.to === "kid" && !clean(body.kid)) return reply({ error: "Which kid?" }, 400);

  // The secret service key: only this function can read the device list
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("KIDDY_SECRET_KEY") ?? "";
  const db = async (fn: string, args: unknown) => {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  };

  const plan = await db("push_prepare", { p_token: body.token, p_to: to });
  if (!plan || !plan.ok) {
    console.log(`alert ${body.kind} to ${to}: NOT ALLOWED (${plan?.error ?? plan?.message ?? "no answer"})`);
    return reply({ error: plan?.error ?? plan?.message ?? "Not allowed" }, 403);
  }
  if (plan.quiet) { console.log(`alert ${body.kind} to ${to}: quiet hours`); return reply({ ok: true, sent: 0, note: "Quiet hours" }); }
  if (!Deno.env.get("VAPID_PRIVATE_KEY") || !Deno.env.get("VAPID_PUBLIC_KEY")) console.log("MISSING a VAPID key secret");

  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:kiddykat@example.com",
                          Deno.env.get("VAPID_PUBLIC_KEY") ?? "", Deno.env.get("VAPID_PRIVATE_KEY") ?? "");
  // A grown-up's alert uses the name the kids call them (like "Dad"); kids and fans use their own names
  const from = plan.sender === "adult" ? (clean(body.fromName, 20) || "Your grown-up") : clean(plan.from, 30);
  const message = JSON.stringify({
    title: kind.title,
    body: kind.words(from, clean(body.detail)),
    url: kind.to === "parents" ? "dashboard.html" : "./",
    tag: body.kind,
  });

  let sent = 0;
  const dead: number[] = [];
  await Promise.all(plan.targets.map(async (t: { id: number; endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, message,
                                     { TTL: 60 * 60 * 12 });
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) dead.push(t.id);       // that device turned alerts off or is gone
      else console.log("push failed", status, String((err as Error).message ?? err));
    }
  }));
  if (dead.length) await db("push_forget", { p_ids: dead });
  console.log(`alert ${body.kind} from ${plan.from} to ${to}: ${plan.targets.length} device(s) found, ${sent} sent, ${dead.length} gone`);
  return reply({ ok: true, sent: sent, devices: plan.targets.length });
});
