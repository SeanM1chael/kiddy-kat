import base64
import json
import sys
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv()                      # reads your API key from .env
client = anthropic.Anthropic()

# 1. Load the photo
photo = Path(sys.argv[1] if len(sys.argv) > 1 else "worksheet.jpg")
media_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
               ".png": "image/png", ".webp": "image/webp"}
media_type = media_types[photo.suffix.lower()]
image_data = base64.standard_b64encode(photo.read_bytes()).decode()

# 2. Tell Claude exactly what we want back
prompt = """This is a photo of a graded school assignment for a young elementary student.
Reply with ONLY JSON in this exact shape, nothing else:
{"subject": "Math" or "Reading" or "Spelling" or "Science" or "Grammar" or "Other",
 "name": "short assignment title",
 "score": number correct,
 "outOf": total number,
 "missed": ["short topic name", ...]}
Rules:
- Use the grade written on the page if there is one. Otherwise count the questions and the ones marked wrong.
- "missed" lists the TOPICS of the questions marked wrong (like "subtraction with borrowing"), not the questions themselves. List each topic once.
- If nothing was marked wrong, use an empty list."""

# 3. Send the photo and the instructions to Claude
message = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "image",
             "source": {"type": "base64", "media_type": media_type, "data": image_data}},
            {"type": "text", "text": prompt},
        ],
    }],
)

# 4. Pull the JSON out of Claude's reply and show it
reply = message.content[0].text
result = json.loads(reply[reply.find("{"): reply.rfind("}") + 1])

print("Subject:   ", result["subject"])
print("Assignment:", result["name"])
print("Score:     ", f'{result["score"]}/{result["outOf"]}')
print("Missed:    ", ", ".join(result["missed"]) or "nothing!")