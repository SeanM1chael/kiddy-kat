// =====================================================================
// kiddy-timer — the clock alerts. A scheduler inside Supabase calls this
// every 5 minutes with a secret key the database made (step 34).
//   School mornings (Mon–Fri), only if the morning list isn't done:
//     ~15 min before leaving  → the kid: "⏰ 12 minutes until you leave!"
//     ~5 min before leaving   → the kid: "🚨 Hurry! 4 minutes left"
//     leave time, still not done → grown-ups: "⏰ Juju's morning list isn't done"
//   Every night, only if the bedtime list isn't done:
//     ~30 min before bedtime  → the kid: "🌙 Bedtime soon"
// Each alert goes out at most once per kid per day.
// Secrets it uses: the same VAPID keys as kiddy-push.
// =====================================================================
import webpush from "npm:web-push@3.6.7";

type Device = { id: number; endpoint: string; p256dh: string; auth: string };
type Kid = {
  id: string; nickname: string; leave: string | null; bed: string | null; tz: string | null;
  today: string | null; tasks: string | null; kidDevices: Device[]; parentDevices: Device[];
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Short, single-line, no odd characters
const clean = (text: unknown, max = 40) =>
  String(text ?? "").replace(/[\r\n\t<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const parse = (text: string | null) => { try { return text ? JSON.parse(text) : null; } catch { return null; } };

// "07:45" → 465 minutes after midnight
const minutesOf = (hhmm: string | null) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// The kid's own clock: today's date, weekday and minutes after midnight in their time zone
function localNow(now: Date, tz: string | null) {
  let zone = "America/Los_Angeles";
  try { if (tz) { new Intl.DateTimeFormat("en-US", { timeZone: tz }); zone = tz; } } catch { /* unknown zone: keep default */ }
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(now).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    schoolDay: !["Sat", "Sun"].includes(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

// "Brush teeth, Pack lunch +2 more"
const listOf = (items: string[]) => {
  const shown = items.slice(0, 3).map((t) => clean(t, 30));
  return shown.join(", ") + (items.length > 3 ? ` +${items.length - 3} more` : "");
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

Deno.serve(async (req) => {
  const key = req.headers.get("x-timer-key") ?? "";
  if (!key) return json({ error: "Not allowed" }, 403);

  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const db = async (fn: string, args: unknown) => {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  };

  const got = await db("timer_kids", { p_key: key });
  if (!got?.ok) { console.log("timer: NOT ALLOWED", got?.error ?? got?.message); return json({ error: "Not allowed" }, 403); }
  if (!Deno.env.get("VAPID_PRIVATE_KEY") || !Deno.env.get("VAPID_PUBLIC_KEY")) console.log("MISSING a VAPID key secret");
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:kiddykat@example.com",
                          Deno.env.get("VAPID_PUBLIC_KEY") ?? "", Deno.env.get("VAPID_PRIVATE_KEY") ?? "");

  const now = new Date();
  const dead: number[] = [];
  const log: string[] = [];

  // Send one alert, once per kid per day per kind
  const send = async (kid: Kid, kind: string, day: string, to: Device[], title: string, body: string, url: string) => {
    if (!to.length) return;
    const first = await db("timer_mark", { p_key: key, p_kid: kid.id, p_kind: kind, p_day: day });
    if (first !== true) return;                                 // already sent today
    const message = JSON.stringify({ title, body, url, tag: kind });
    let sent = 0;
    await Promise.all(to.map(async (t) => {
      try {
        await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, message, { TTL: 60 * 20 });
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(t.id);
        else console.log("push failed", status, String((err as Error).message ?? err));
      }
    }));
    log.push(`${kind} for ${kid.nickname}: ${sent}/${to.length} sent`);
  };

  for (const kid of (got.kids ?? []) as Kid[]) {
    const local = localNow(now, kid.tz);
    const tasks = parse(kid.tasks) ?? {};
    const today = parse(kid.today);
    // What's left on a list today. If the app hasn't been opened today, the whole list is left.
    const left = (list: string): string[] => {
      const fromPhone = today && today.date === local.date ? today[`${list}Left`] : null;
      return Array.isArray(fromPhone) ? fromPhone : (Array.isArray(tasks[list]) ? tasks[list] : []);
    };

    const leave = minutesOf(kid.leave);
    if (leave !== null && local.schoolDay) {
      const m = leave - local.minutes;
      const todo = left("morning");
      if (todo.length) {
        if (m > 5 && m <= 15) {
          await send(kid, "morning15", local.date, kid.kidDevices, `⏰ ${m} minutes until you leave!`,
                     `Still to do: ${listOf(todo)}`, "./");
        } else if (m > 0 && m <= 5) {
          await send(kid, "morning5", local.date, kid.kidDevices, `🚨 Hurry! ${plural(m, "minute")} left`,
                     `Still to do: ${listOf(todo)}`, "./");
        } else if (m <= 0 && m > -15) {
          await send(kid, "late", local.date, kid.parentDevices, "⏰ Morning list not done",
                     `${clean(kid.nickname, 30)} has ${plural(todo.length, "morning task")} left: ${listOf(todo)}`, "dashboard.html");
        }
      }
    }

    const bed = minutesOf(kid.bed);
    if (bed !== null) {
      let m = bed - local.minutes;
      if (m < -720) m += 1440;                                  // bedtime just after midnight
      const todo = left("bedtime");
      if (todo.length && m > 0 && m <= 30) {
        await send(kid, "bedtime", local.date, kid.kidDevices, "🌙 Bedtime soon",
                   `${plural(m, "minute")} to bedtime. ${plural(todo.length, "task")} to go: ${listOf(todo)}`, "./");
      }
    }
  }

  if (dead.length) await db("push_forget", { p_ids: dead });
  console.log(`timer: ${(got.kids ?? []).length} kid(s) checked${log.length ? "; " + log.join("; ") : ", nothing due"}`);
  return json({ ok: true, checked: (got.kids ?? []).length, sent: log });
});
