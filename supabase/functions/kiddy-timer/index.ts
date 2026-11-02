// =====================================================================
// kiddy-timer — the clock alerts. A scheduler inside Supabase calls this
// every 5 minutes with a secret key the database made (step 34).
//   School mornings (Mon–Fri), only if the morning list isn't done:
//     ~15 min before leaving  → the kid: "⏰ 12 minutes until you leave!"
//     ~5 min before leaving   → the kid: "🚨 Hurry! 4 minutes left"
//     leave time, still not done → grown-ups: "⏰ Juju's morning list isn't done"
//   Every night, only if the bedtime list isn't done:
//     ~30 min before bedtime  → the kid: "🌙 Bedtime soon"
//   Grown-ups' bills (career mode), about 9 AM their time:
//     on the reminder day     → their app: "🧾 Bill reminder: Rent due tomorrow"
//     due day, at the time they pick (like 6 PM), still not marked paid → "⚠️ Rent isn't marked paid yet"
//     the next morning, still not paid → included in the 9 AM alert as overdue
//   Grocery day (picked on the dashboard), at the time picked:
//     → grown-ups: "🛒 Grocery day! Toothpaste (PJ Flash, Juju), Deodorant (PJ Flash)"
// Each alert goes out at most once per kid per day.
// Secrets it uses: the same VAPID keys as kiddy-push.
// =====================================================================
import webpush from "npm:web-push@3.6.7";

type Device = { id: number; endpoint: string; p256dh: string; auth: string };
type Kid = {
  id: string; nickname: string; leave: string | null; bed: string | null; tz: string | null;
  today: string | null; tasks: string | null; bills: string | null; kidDevices: Device[]; parentDevices: Device[];
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
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

// "Brush teeth, Pack lunch +2 more"
const listOf = (items: string[]) => {
  const shown = items.slice(0, 3).map((t) => clean(t, 30));
  return shown.join(", ") + (items.length > 3 ? ` +${items.length - 3} more` : "");
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ---------- 🛒 Grocery list: "Toothpaste (PJ Flash 🔴, Juju), Deodorant (PJ Flash)" ----------
type Item = { nickname: string; name: string; status: string };
function groceryList(items: Item[]) {
  const byName = new Map<string, string[]>();
  const shown = new Map<string, string>();
  for (const i of items) {
    const key = clean(i.name, 30).toLowerCase();
    if (!key) continue;
    if (!byName.has(key)) { byName.set(key, []); shown.set(key, clean(i.name, 30)); }
    byName.get(key)!.push(clean(i.nickname, 20) + (i.status === "out" ? " 🔴" : ""));
  }
  const parts = [...byName.entries()].map(([k, who]) => `${shown.get(k)} (${who.join(", ")})`);
  let text = "";
  let used = 0;
  for (const p of parts) {
    if ((text + p).length > 170) break;
    text += (text ? ", " : "") + p;
    used += 1;
  }
  return { count: parts.length, text: text + (used < parts.length ? ` +${parts.length - used} more` : "") };
}

// ---------- Bills (no amounts ever come here: just names, schedules and paid dates) ----------
type Bill = { name: string; every: string; day: number; remind: number; start: string; paid: string[]; autopay?: boolean; late?: string };
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (key: string, n: number) => { const d = new Date(key + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return dayKey(d); };
// Is this bill due on this day?
function billDueOn(bill: Bill, key: string) {
  if (bill.start && key < bill.start) return false;
  const d = new Date(key + "T12:00:00Z");
  if (bill.every === "week") return d.getUTCDay() === Number(bill.day);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return d.getUTCDate() === Math.min(Number(bill.day) || 1, last);
}
// "Rent due tomorrow, Phone due today"
function billsToRemind(bills: Bill[], today: string) {
  const out: string[] = [];
  for (const bill of bills) {
    const r = Number(bill.remind);
    if (!(r >= 0)) continue;
    const days = r === 0 ? [0] : [r, 0];                       // the reminder day, plus a nudge on the due day
    for (const n of days) {
      const due = addDays(today, n);
      if (billDueOn(bill, due) && !(bill.paid ?? []).includes(due)) {
        out.push(`${clean(bill.name, 30)} due ${n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`}`);
        break;
      }
    }
  }
  return out;
}

// Bills due on a day that still aren't marked paid (autopay bills pay themselves, so they're skipped)
function billsUnpaid(bills: Bill[], day: string) {
  return bills.filter((b) => !b.autopay && billDueOn(b, day) && !(b.paid ?? []).includes(day)).map((b) => clean(b.name, 30));
}

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

  // 🧾 Bill reminders: once a day, around 9 AM the grown-up's time
  for (const kid of (got.kids ?? []) as Kid[]) {
    const bills = parse(kid.bills);
    if (!Array.isArray(bills) || !bills.length) continue;
    const local = localNow(now, kid.tz);
    const to = kid.kidDevices.length ? kid.kidDevices : kid.parentDevices;
    // Morning: what's coming up, plus anything from yesterday still not paid
    if (local.minutes >= 9 * 60 && local.minutes < 10 * 60) {
      const late = billsUnpaid(bills as Bill[], addDays(local.date, -1)).map((n) => `${n} was due yesterday`);
      const due = late.concat(billsToRemind(bills as Bill[], local.date));
      if (due.length) {
        await send(kid, "bills", local.date, to,
                   late.length ? "⚠️ Overdue bill" + (late.length === 1 ? "" : "s") : due.length === 1 ? "🧾 Bill reminder" : `🧾 ${due.length} bill reminders`,
                   due.slice(0, 4).join(", ") + (due.length > 4 ? ` +${due.length - 4} more` : ""), "./");
      }
    }
    // Due day, at the time they picked: still not marked paid?
    const lateAt = minutesOf((bills as Bill[])[0]?.late ?? null);
    if (lateAt !== null && local.minutes >= lateAt && local.minutes < lateAt + 30) {
      const unpaid = billsUnpaid(bills as Bill[], local.date);
      if (unpaid.length) {
        await send(kid, "billslate", local.date, to, "⚠️ Not marked paid yet",
                   `${unpaid.slice(0, 3).join(", ")}${unpaid.length > 3 ? ` +${unpaid.length - 3} more` : ""} ${unpaid.length === 1 ? "is" : "are"} due today and not marked paid yet`, "./");
      }
    }
  }

  // 🛒 Grocery day: the kids' low and out supplies, to the grown-ups at the time they picked
  const groceries = await db("timer_grocery", { p_key: key });
  for (const fam of (groceries?.families ?? []) as { marker: string; day: number; time: string; tz: string; items: Item[]; parentDevices: Device[]; eagleDevices: Device[] }[]) {
    const local = localNow(now, fam.tz);
    const at = minutesOf(fam.time);
    if (at === null || local.weekday !== Number(fam.day) || local.minutes < at || local.minutes >= at + 30) continue;
    const list = groceryList(fam.items ?? []);
    const who = { id: fam.marker, nickname: "family" } as Kid;
    const to = fam.parentDevices?.length ? fam.parentDevices : (fam.eagleDevices ?? []);   // dashboard alerts first, else the 🦅 app
    await send(who, "grocery", local.date, to,
               list.count ? `🛒 Grocery day! The kids need ${plural(list.count, "thing")}` : "🛒 Grocery day!",
               list.count ? list.text : "Nothing on the kids' supply list this week. ✅", "dashboard.html");
  }

  if (dead.length) await db("push_forget", { p_ids: dead });
  console.log(`timer: ${(got.kids ?? []).length} kid(s) checked${log.length ? "; " + log.join("; ") : ", nothing due"}`);
  return json({ ok: true, checked: (got.kids ?? []).length, sent: log });
});
