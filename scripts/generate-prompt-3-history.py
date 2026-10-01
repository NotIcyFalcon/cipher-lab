import os

def read_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"// Could not read {path}: {str(e)}"

prompts = {
    "1": {
        "title": "Batch 2 Updates",
        "description": "I have imported our history up to Batch 1. Since then, I implemented Batch 2, which added a new stylesheet and updated the Learning Paths and Lesson components. Please read the following updated files from Batch 2 so you are completely up to date with the new UI patterns. Do NOT write any code yet. Just reply 'Batch 2 absorbed.'",
        "files": [
            "src/app/batch-two.css",
            "src/app/paths/page.tsx",
            "src/components/LearningPage.tsx",
            "src/components/LabTerminal.tsx"
        ]
    },
    "2": {
        "title": "Target Homework Files",
        "description": "Great. Now here are the current Homework files that we will be modifying for Batch 3. Do NOT write any code yet. Just reply 'Homework files absorbed, ready for instructions.'",
        "files": [
            "src/app/homework/page.tsx",
            "src/app/homework/[chapterId]/page.tsx",
            "src/components/HomeworkQuestionCard.tsx",
            "src/server/homework-catalog.ts"
        ]
    }
}

with open('BATCH_3_AFTER_HISTORY.md', 'w', encoding='utf-8') as out:
    out.write('# Batch 3 Prompts (After Importing History)\n\n')
    out.write('Since your AI already remembers everything up to Batch 1, we just need to bring it up to speed on Batch 2 and then give it the Batch 3 instructions. Paste these 3 prompts in sequence.\n\n')
    
    for i in range(1, 3):
        p = prompts[str(i)]
        out.write(f'## PROMPT {i}: {p["title"]}\n')
        out.write('```text\n')
        out.write(f'{p["description"]}\n\n')
        for f in p["files"]:
            out.write(f'--- BEGIN FILE: {f} ---\n{read_file(f)}\n--- END FILE: {f} ---\n\n')
        out.write('```\n\n')
    
    out.write('## PROMPT 3: Batch 3 Instructions\n')
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
