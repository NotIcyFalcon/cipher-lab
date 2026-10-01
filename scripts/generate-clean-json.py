import json
import time

def read_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"// Could not read {path}: {str(e)}"

files_to_bundle = [
    'src/app/globals.css',
    'src/app/workspace.css',
    'src/app/batch-two.css',
    'src/components/WorkspaceShell.tsx',
    'src/content/lessons.ts',
    'src/content/paths.ts',
    'src/lib/path-progress.ts',
    'src/server/homework-catalog.ts',
    'src/app/homework/page.tsx',
    'src/app/homework/[chapterId]/page.tsx',
    'src/components/HomeworkQuestionCard.tsx'
]

# Build the mega-context string
context_content = "I am building a Next.js cybersecurity learning platform called Cyber Box. I have already completed Batch 1 and Batch 2 of my UI refactor, establishing a premium design language.\n\nHere is the current state of my core files (CSS, Layout, Progress Logic, and Homework). Please read them carefully. Do not write any code yet. Just confirm you understand.\n\n"

for f in files_to_bundle:
    context_content += f"--- BEGIN FILE: {f} ---\n{read_file(f)}\n--- END FILE: {f} ---\n\n"

batch_3_instructions = """Please implement **Batch 3: Homework Restructuring**.

Here are the requirements:

### 📦 BATCH 3: Homework Restructuring (Locked Logic & Grader UI)
1. **Homework Catalog Logic (`src/app/homework/page.tsx` & `src/server/homework-catalog.ts`)**
   - Right now, all homework is open to everyone immediately.
   - Implement **Locked Logic**: A user should NOT be able to click on or access a homework chapter unless they have completed the **reading** for that chapter's lesson (using `progress.readingIds`).
   - Show a clear "Locked" state in the UI for chapters they haven't read yet (e.g., greyed out, lock icon, "Read chapter to unlock").
   - Redesign the list of homework chapters to match the premium UI from `batch-two.css` and `workspace.css`.
2. **Homework Grader UI (`src/app/homework/[chapterId]/page.tsx` & `src/components/HomeworkQuestionCard.tsx`)**
   - The current `HomeworkQuestionCard` looks very basic.
   - Redesign the grader UI to feel like a premium code-upload terminal or an interactive mission briefing.
   - Improve the display of the test results (Expected vs. Actual Output). It should look like a clean, color-coded terminal log (Green for Pass, Red for Fail) rather than basic HTML pre tags.
   - Show a prominent "Perfect Score" or "Completed" badge if `bestXp` equals `question.totalPoints`.
   - Create a new file `src/app/batch-three.css` for your new CSS, and import it where necessary.

Provide the complete updated code for the files you modify, and the new `batch-three.css`. Do NOT proceed to Batch 4 yet. Format your response clearly with file blocks.
"""

now = int(time.time() * 1000)

clean_json = {
    "messages": [
        {
            "role": "user",
            "content": context_content,
            "createAt": now - 2000,
            "id": "1"
        },
        {
            "role": "assistant",
            "content": "Context absorbed! I understand the project structure, the premium styling language we established in Batch 1 and Batch 2, and the current state of the Homework UI logic. I am ready to implement any further batches.",
            "createAt": now - 1000,
            "id": "2",
            "reasoningContent": "",
            "isReasoningExpanded": False,
            "isThinkingComplete": True,
            "hasAutoCollapsed": True,
            "status": "complete"
        },
        {
            "role": "user",
            "content": batch_3_instructions,
            "createAt": now,
            "id": "3"
        }
    ],
    "exportTime": "2026-10-01T13:30:00.000Z",
    "version": "1.0"
}

with open(r'C:\Users\Yash Ola\Downloads\clean-batch-3.json', 'w', encoding='utf-8') as f:
    json.dump(clean_json, f, indent=2)

print("Wrote clean-batch-3.json")
