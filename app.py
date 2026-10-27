import json
from pathlib import Path
import base64

import anthropic
from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request, send_from_directory

load_dotenv()                       # reads your API key from .env
client = anthropic.Anthropic()
app = Flask(__name__)
HERE = Path(__file__).parent        # the kiddy-kat folder

SUBJECTS = ["Math", "Reading", "Grammar", "Spelling", "Writing",
            "Science", "Social Studies", "Other"]

MEDIA_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
               ".png": "image/png", ".webp": "image/webp"}

WORKSHEET_PROMPT = """This is a photo of a graded school assignment for a young elementary student.
Reply with ONLY JSON in this exact shape, nothing else:
{"subject": one of SUBJECT_LIST,
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
- A date like 10-8-26 means 10/8/2026.""".replace("SUBJECT_LIST", " or ".join(f'"{s}"' for s in SUBJECTS))

REPORT_CARD_PROMPT = """This is a photo of an elementary school report card or progress report.
Reply with ONLY JSON in this exact shape, nothing else:
{"school_year": "like 2026-2027",
 "report_date": "the date printed on it as M/D/YYYY, or null",
 "classes": [{"name": "class name exactly as printed", "percent": number or null, "mark": "letter or code as printed, or null"}, ...],
 "attendance": {"enrolled": number or null, "absent": number or null, "tardy": number or null}}
Rules:
- Include EVERY class row, even ones with no grade yet (use null).
- Do NOT include the student's name, student ID, teacher, principal, school name, address or phone number.
- Percent is just the number, like 67.26, without the % sign."""
CAMPUS_PROMPT = """This is a screenshot from Infinite Campus (the Campus Parent or Campus Student app or website)
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
- Percent is just the number, like 87.5, without the % sign."""


def ask_claude(image_bytes, media_type, prompt, max_tokens=1024):
    """Send one photo plus instructions to Claude and return its JSON answer."""
    message = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=max_tokens,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image",
                 "source": {"type": "base64", "media_type": media_type,
                            "data": base64.standard_b64encode(image_bytes).decode()}},
                {"type": "text", "text": prompt},
            ],
        }],
    )
    # Claude's answer can include a "thinking" part before the text part,
    # so join only the text parts instead of assuming the first part is text
    reply = "".join(block.text for block in message.content if block.type == "text")
    return json.loads(reply[reply.find("{"): reply.rfind("}") + 1])


# --- Pages ---------------------------------------------------------------

@app.route("/")
def home():
    return send_from_directory(HERE, "index.html")

@app.route("/<name>.html")
def page(name):
    # Only .html pages are served, so files like .env can never be downloaded
    return send_from_directory(HERE, f"{name}.html")

@app.route("/<name>.js")
def script(name):
    # JavaScript files the pages load, like pet.js and games.js
    return send_from_directory(HERE, f"{name}.js")

@app.route("/<name>.png")
def icon(name):
    # App icons (icon.png, tiger.png, lion.png)
    return send_from_directory(HERE, f"{name}.png")


# --- Photo reading -------------------------------------------------------

@app.post("/read-worksheet")
def read_worksheet():
    photo = request.files.get("photo")
    if not photo:
        return jsonify(error="No photo was sent."), 400

    media_type = MEDIA_TYPES.get(Path(photo.filename).suffix.lower())
    if not media_type:
        return jsonify(error="Please use a JPG, PNG or WebP photo. iPhone HEIC photos won't work."), 400

    return jsonify(ask_claude(photo.read(), media_type, WORKSHEET_PROMPT))

@app.post("/read-report-card")
def read_report_card():
    photo = request.files.get("photo")
    if not photo:
        return jsonify(error="No photo was sent."), 400

    media_type = MEDIA_TYPES.get(Path(photo.filename).suffix.lower())
    if not media_type:
        return jsonify(error="Please use a JPG, PNG or WebP photo. iPhone HEIC photos won't work."), 400

    return jsonify(ask_claude(photo.read(), media_type, REPORT_CARD_PROMPT))


@app.post("/read-campus")
def read_campus():
    photo = request.files.get("photo")
    if not photo:
        return jsonify(error="No photo was sent."), 400

    media_type = MEDIA_TYPES.get(Path(photo.filename).suffix.lower())
    if not media_type:
        return jsonify(error="Please use a JPG, PNG or WebP screenshot."), 400

    # Assignment lists can be long, so allow a longer answer
    return jsonify(ask_claude(photo.read(), media_type, CAMPUS_PROMPT, max_tokens=4096))


WHAT_IS_IT_PROMPT = """What kind of picture is this? Answer with ONLY one word:
worksheet   = a graded school assignment, quiz or test on paper
reportcard  = a printed report card or progress report
campus      = a screenshot of the Infinite Campus app or website (grades, assignments or comments)
other       = anything else"""


@app.post("/read-auto")
def read_auto():
    """Figures out what kind of picture it is, then reads it the right way."""
    photo = request.files.get("photo")
    if not photo:
        return jsonify(error="No photo was sent."), 400
    media_type = MEDIA_TYPES.get(Path(photo.filename).suffix.lower())
    if not media_type:
        return jsonify(error="Please use a JPG, PNG or WebP photo. iPhone HEIC photos won't work."), 400

    image = photo.read()
    message = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=300,          # room in case Claude thinks before answering
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": media_type,
                                         "data": base64.standard_b64encode(image).decode()}},
            {"type": "text", "text": WHAT_IS_IT_PROMPT}]}],
    )
    answer = "".join(b.text for b in message.content if b.type == "text").strip().lower()

    if "campus" in answer:
        return jsonify(kind="campus", result=ask_claude(image, media_type, CAMPUS_PROMPT, max_tokens=4096))
    if "report" in answer:
        return jsonify(kind="report-card", result=ask_claude(image, media_type, REPORT_CARD_PROMPT))
    if "worksheet" in answer:
        return jsonify(kind="worksheet", result=ask_claude(image, media_type, WORKSHEET_PROMPT))
    return jsonify(error="That doesn't look like schoolwork, a report card or an Infinite Campus screenshot."), 400


# --- Errors ---------------------------------------------------------------
# Send problems back as a short message the page can show, instead of a web page

@app.errorhandler(Exception)
def show_error(error):
    print("PROBLEM:", type(error).__name__, error)           # also shows in the terminal
    message = f"{type(error).__name__}: {error}"
    if getattr(error, "code", None) == 404:
        return jsonify(error="That address isn't on the server. If app.py was just updated, "
                             "restart it: Ctrl+C in its terminal, then py app.py"), 404
    if isinstance(error, json.JSONDecodeError):
        message = "Claude's answer was cut off or wasn't in the expected format. Try a smaller screenshot (one section at a time)."
    return jsonify(error="The server hit a problem. " + message), 500


if __name__ == "__main__":
    app.run(port=5000, debug=True)