import os

def read_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"// Could not read {path}: {str(e)}"

prompts = {
    "1": {
        "title": "Architecture, CSS, and Layout",
        "description": "I am building a Next.js cybersecurity learning platform called Cyber Box. I have already built the core framework, the dashboard, and the learning paths. I need your help to refactor the Homework section (which I call Batch 3) to match my premium UI style.\n\nPlease read the following context files representing my global CSS and main layout shell. Do NOT write any code yet. Just reply 'Styles and layout absorbed.'",
        "files": [
            "src/app/globals.css",
            "src/app/workspace.css",
            "src/app/batch-two.css",
            "src/components/WorkspaceShell.tsx"
        ]
    },
    "2": {
        "title": "Data Models and Progress Logic",
        "description": "Great. Now read the data models that define my lessons, paths, progress tracking, and homework catalog. Do NOT write any code yet. Just reply 'Data models absorbed.'",
        "files": [
            "src/content/lessons.ts",
            "src/content/paths.ts",
            "src/lib/path-progress.ts",
            "src/server/homework-catalog.ts"
        ]
    },
    "3": {
        "title": "Target Homework Files",
        "description": "Awesome. Finally, read the React components for the Homework section that we will actually be modifying for Batch 3. Do NOT write any code yet. Just reply 'Target components absorbed, ready for instructions.'",
        "files": [
            "src/app/homework/page.tsx",
            "src/app/homework/[chapterId]/page.tsx",
            "src/components/HomeworkQuestionCard.tsx"
        ]
    }
}

with open('BATCH_3_FULL_PROMPTS.md', 'w', encoding='utf-8') as out:
    out.write('# Full Batch 3 Prompts (For a Brand New AI Session)\n\n')
    out.write('Since your credits expired and the new AI has no memory of Batch 1 or Batch 2, we have to feed it the entire project context (including all the gorgeous CSS we wrote) so it can perfectly match the design. Paste these 4 prompts in sequence.\n\n')
    
    for i in range(1, 4):
        p = prompts[str(i)]
        out.write(f'## PROMPT {i}: {p["title"]}\n')
        out.write('```text\n')
        out.write(f'{p["description"]}\n\n')
        for f in p["files"]:
            out.write(f'--- BEGIN FILE: {f} ---\n{read_file(f)}\n--- END FILE: {f} ---\n\n')
        out.write('```\n\n')
    
    out.write('## PROMPT 4: Batch 3 Instructions\n')
    out.write('```text\n')
    out.write('Please implement **Batch 3: Homework Restructuring**.\n\n')
    out.write('Here are the requirements:\n\n')
    out.write('### 📦 BATCH 3: Homework Restructuring (Locked Logic & Grader UI)\n')
    out.write('1. **Homework Catalog Logic (`src/app/homework/page.tsx` & `src/server/homework-catalog.ts`)**\n')
    out.write('   - Right now, all homework is open to everyone immediately.\n')
    out.write('   - Implement **Locked Logic**: A user should NOT be able to click on or access a homework chapter unless they have completed the **reading** for that chapter\'s lesson (using `progress.readingIds`).\n')
    out.write('   - Show a clear "Locked" state in the UI for chapters they haven\'t read yet (e.g., greyed out, lock icon, "Read chapter to unlock").\n')
    out.write('   - Redesign the list of homework chapters to match the premium UI from `batch-two.css` and `workspace.css`.\n')
    out.write('2. **Homework Grader UI (`src/app/homework/[chapterId]/page.tsx` & `src/components/HomeworkQuestionCard.tsx`)**\n')
    out.write('   - The current `HomeworkQuestionCard` looks very basic.\n')
    out.write('   - Redesign the grader UI to feel like a premium code-upload terminal or an interactive mission briefing.\n')
    out.write('   - Improve the display of the test results (Expected vs. Actual Output). It should look like a clean, color-coded terminal log (Green for Pass, Red for Fail) rather than basic HTML pre tags.\n')
    out.write('   - Show a prominent "Perfect Score" or "Completed" badge if `bestXp` equals `question.totalPoints`.\n')
    out.write('   - Create a new file `src/app/batch-three.css` for your new CSS, and import it where necessary.\n\n')
    out.write('Provide the complete updated code for the files you modify, and the new `batch-three.css`. Do NOT proceed to Batch 4 yet. Format your response clearly with file blocks.\n')
    out.write('```\n')
