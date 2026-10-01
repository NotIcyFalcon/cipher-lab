import json
import time

def read_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"// Could not read {path}: {str(e)}"

# Load the original configuration to preserve its structure
original_path = r'C:\Users\Yash Ola\Downloads\playground-config-2026-10-01.json'
with open(original_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

# BUNDLE: Target ~130KB
files_to_bundle = [
    'src/app/globals.css',                  # Foundation
    'src/app/workspace.css',                # Layout classes
    'src/app/batch-three.css',              # Essential for newest premium UI
    'src/app/paths/page.tsx',               # Essential for category grouping UI
    'src/app/homework/[chapterId]/page.tsx',# Essential for detail page UI
    'src/components/WorkspaceShell.tsx',    # Sidebar context
    'src/components/LabTerminal.tsx',       # Essential for embedding the terminal
    'src/server/db.ts',                     # Essential for DB pattern
    'src/server/progress.ts',               # Essential for Progress logic
    'src/lib/progress-types.ts',
    'migrations/001_initial.sql',           # Essential for schema
    'src/app/actions/grade-homework.ts',    # CRITICAL: Shows Server Action + SQLite transaction patterns!
    'src/server/homework-catalog.ts',       # CRITICAL: Shows how content is handled server-side
    'src/server/current-user.ts'            # CRITICAL: Shows Auth pattern
]

context_content = "I am building a Next.js cybersecurity learning platform called Cyber Box. I have already completed Batch 1, 2, and 3 of my UI refactor, establishing a highly premium design language. We are now moving to Batch 4: The Complete CTF Revamp.\n\nHere is the state of my core files (CSS, UI Examples, Terminal, Server Actions, and DB patterns). Please read them carefully. Do not write any code yet. Just confirm you understand and tell me you are ready for the Batch 4 instructions.\n\n"

for f in files_to_bundle:
    context_content += f"--- BEGIN FILE: {f} ---\n{read_file(f)}\n--- END FILE: {f} ---\n\n"

# Manually insert ONLY the types for lessons to save thousands of tokens
context_content += """--- BEGIN FILE: src/content/lessons.ts (TYPES ONLY) ---
export type ContentBlock = 
  | { id: string; type: "note" | "tip"; title: string; body: string; }
  | { id: string; type: "code"; title: string; code: string; caption: string; }
  | { id: string; type: "lab"; labId: string; title: string; objective: string; hint: string; }
  | { id: string; type: "quiz"; question: string; options: string[]; answer: number; explanation: string; };

export type Lesson = {
  id: string; title: string; description: string;
  category: string; minutes: number; xp: number;
  objectives: string[]; blocks: ContentBlock[];
};
--- END FILE: src/content/lessons.ts (TYPES ONLY) ---
"""

now = int(time.time() * 1000)

config['messages'] = [
    {
        "role": "user",
        "content": context_content,
        "createAt": now - 2000,
        "id": "1"
    }
]

with open(r'C:\Users\Yash Ola\Downloads\clean-batch-4.json', 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2)

print("Wrote balanced clean-batch-4.json.")
