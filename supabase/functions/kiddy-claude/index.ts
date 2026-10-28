// =====================================================================
// kiddy-claude — Kiddy Kat's Claude helper, running in Supabase
// Does what app.py did on the PC: reads schoolwork photos and writes
// practice packs. The Claude API key lives in Supabase's secrets, never
// in the app. Every call checks the grown-up login and the $5/month cap.
// =====================================================================

const MODEL = "claude-sonnet-5-5";

// Cost counted on the high side so the $5 cap is never passed:
// millionths of a dollar per token (= dollars per million tokens)
const INPUT_COST = 3;
const OUTPUT_COST = 15;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUBJECTS = ["Math", "Reading", "Grammar", "Spelling", "Writing", "Science", "Social Studies", "Other"];

const WORKSHEET_PROMPT = `This is a photo of a graded school assignment for a young elementary student.
Reply with ONLY JSON in this exact shape, nothing else:
{"subject": one of ${SUBJECTS.map((s) => `"${s}"`).join(" or ")},
 "name": "short assignment title",
 "date": "the date written on the page as M/D/YYYY, or null if there is none",
 "score": number correct,
 "outOf": total number of questions,
 "topics": ["short skill name", ...],
 "missed": ["short skill name", ...]}
Rules:
- Use the grade written on the page if there is one. If it is a percent, count the questions for outOf and work out score from the percent.
- "topics" lists every skill the page practices (like "plural nouns"), each once.
- "missed" lists the skills of questions marked wrong, using the same names as in "topics". Empty list if nothing was wrong.
- A date like 10-8-26 means 10/8/2026.`;

const REPORT_CARD_PROMPT = `This is a photo of an elementary school report card or progress report.
Reply with ONLY JSON in this exact shape, nothing else:
{"school_year": "like 2026-2027",
 "report_date": "the date printed on it as M/D/YYYY, or null",
 "classes": [{"name": "class name exactly as printed", "percent": number or null, "mark": "letter or code as printed, or null"}, ...],
 "attendance": {"enrolled": number or null, "absent": number or null, "tardy": number or null}}
Rules:
- Include EVERY class row, even ones with no grade yet (use null).
- Do NOT include the student's name, student ID, teacher, principal, school name, address or phone number.
- Percent is just the number, like 67.26, without the % sign.`;

const CAMPUS_PROMPT = `This is a screenshot from Infinite Campus (the Campus Parent or Campus Student app or website)
showing a student's grades, assignments, or teacher comments.
Reply with ONLY JSON in this exact shape, nothing else:
{"classes": [{"name": "class name", "percent": number or null, "mark": "letter grade or null"}],
 "assignments": [{"class": "class name or null", "name": "assignment name", "due": "M/D/YYYY or null",
                  "score": number or null, "outOf": number or null,
                  "status": "missing" or "late" or "graded" or "not graded"}],
 "comments": [{"class": "class name or null", "comment": "the teacher's comment"}]}
Rules:
- Only include what you can actually see in the screenshot. Use empty lists when there is nothing.
- An assignment is "missing" if it is marked Missing, M, or flagged as not turned in.
- Do NOT include the student's name, student ID, teacher names, school name or any contact info.
  If a comment mentions the student by name, write "the student" instead.
- Percent is just the number, like 87.5, without the % sign.`;

const WHAT_IS_IT_PROMPT = `What kind of picture is this? Answer with ONLY one word:
worksheet   = a graded school assignment, quiz or test on paper
reportcard  = a printed report card or progress report
campus      = a screenshot of the Infinite Campus app or website (grades, assignments or comments)
other       = anything else`;

const PACK_PROMPT = `Make a short practice pack for a kid.
Kid's level: LEVEL
Practice these topics (from schoolwork they missed or classes where they're struggling):
TOPICS

Write exactly COUNT multiple-choice questions. Mix the topics. Make them encouraging, clear and right for the kid's age.
For young kids: short words, simple sentences, small numbers. For teens: real grade-level questions.
Reply with ONLY JSON in this exact shape, nothing else:
{"title": "short fun title for the pack",
 "questions": [{"topic": "which topic", "q": "the question", "choices": ["A", "B", "C", "D"], "a": 0, "why": "one short sentence explaining the right answer"}]}
Rules:
- "a" is the position of the right answer in "choices" (0 to 3). Put the right answer in different positions.
- Exactly 4 choices, all different, with exactly one correct answer. Double-check every answer is right.
- No questions that need a picture. Keep each choice under 40 characters.`;

const LEVELS: Record<string, string> = {
  kitten: "about 2nd grade (age 7-9)",
  tiger: "about 6th-7th grade (age 10-13)",
  lion: "about 10th-11th grade (age 14-17)",
};

const READERS: Record<string, [string, number]> = {
  "worksheet": [WORKSHEET_PROMPT, 1024],
  "report-card": [REPORT_CARD_PROMPT, 1024],
  "campus": [CAMPUS_PROMPT, 4096],
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// Pulls the JSON object out of Claude's answer
function jsonFrom(text: string) {
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "Use POST" }, 405);

  const body = await req.json().catch(() => ({}));
  const apikey = req.headers.get("apikey") ?? "";

  // Talks to our database functions (same locks as the app: PIN-checked logins only)
  const db = async (fn: string, args: unknown) => {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    return await r.json();
  };

  // 1. Grown-up login + money left this month?
  if (!body.token) return reply({ error: "Please log in as a grown-up" }, 403);
  const start = await db("ai_start", { p_token: body.token });
  if (!start.ok) return reply({ error: start.error ?? start.message ?? "Please log in as a grown-up" }, 403);

  let cost = 0;   // adds up what this request costs

  async function claude(content: unknown, maxTokens: number): Promise<string> {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content }] }),
    });
    const message = await r.json();
    if (!r.ok) throw new Error(message?.error?.message ?? `Claude error ${r.status}`);
    cost += (message.usage?.input_tokens ?? 0) * INPUT_COST + (message.usage?.output_tokens ?? 0) * OUTPUT_COST;
    // Claude's answer can include a "thinking" part, so join only the text parts
    return message.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  }

  try {
    // 2a. Read a photo (worksheet, report card, Infinite Campus, or "auto" to figure it out)
    if (body.action === "read") {
      if (!["image/jpeg", "image/png", "image/webp"].includes(body.media_type) || !body.image) {
        return reply({ error: "Please use a JPG, PNG or WebP photo." }, 400);
      }
      const image = { type: "image", source: { type: "base64", media_type: body.media_type, data: body.image } };
      const read = async (kind: string) => {
        const [prompt, maxTokens] = READERS[kind];
        return jsonFrom(await claude([image, { type: "text", text: prompt }], maxTokens));
      };
      if (body.kind !== "auto") {
        if (!READERS[body.kind]) return reply({ error: "Unknown photo type" }, 400);
        return reply(await read(body.kind));
      }
      const answer = (await claude([image, { type: "text", text: WHAT_IS_IT_PROMPT }], 300)).toLowerCase();
      if (answer.includes("campus")) return reply({ kind: "campus", result: await read("campus") });
      if (answer.includes("report")) return reply({ kind: "report-card", result: await read("report-card") });
      if (answer.includes("worksheet")) return reply({ kind: "worksheet", result: await read("worksheet") });
      return reply({ error: "That doesn't look like schoolwork, a report card or an Infinite Campus screenshot." }, 400);
    }

    // 2b. Write a practice pack
    if (body.action === "pack") {
      const topics = (body.topics ?? []).map((t: unknown) => String(t).trim()).filter((t: string) => t).slice(0, 12);
      if (!topics.length) return reply({ error: "Add at least one topic to practice." }, 400);
      const count = Math.min(Math.max(Number(body.count) || 10, 5), 20);
      const level = LEVELS[body.level] ? body.level : "kitten";
      const prompt = PACK_PROMPT.replace("LEVEL", LEVELS[level])
        .replace("TOPICS", topics.map((t: string) => "- " + t).join("\n"))
        .replace("COUNT", String(count));
      const pack = jsonFrom(await claude([{ type: "text", text: prompt }], 6000));
      // Keep only questions that are built correctly
      const good = (pack.questions ?? []).filter((q: { q?: string; choices?: unknown[]; a?: number }) =>
        q.q && Array.isArray(q.choices) && q.choices.length === 4 &&
        new Set(q.choices).size === 4 && [0, 1, 2, 3].includes(q.a as number));
      if (!good.length) return reply({ error: "Claude's questions didn't come out right. Try again." }, 500);
      return reply({ title: pack.title ?? "Practice pack", level, topics, questions: good });
    }

    return reply({ error: "Unknown action" }, 400);
  } catch (err) {
    const text = err instanceof SyntaxError
      ? "Claude's answer was cut off or wasn't in the expected format. Try a smaller screenshot (one section at a time)."
      : String((err as Error).message ?? err);
    return reply({ error: "The server hit a problem. " + text }, 500);
  } finally {
    // 3. Write down what it cost, even if something went wrong
    if (cost > 0) await db("ai_log", { p_token: body.token, p_kind: String(body.action), p_cost_micro: Math.ceil(cost) });
  }
});
