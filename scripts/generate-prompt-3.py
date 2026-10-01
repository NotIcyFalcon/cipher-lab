import os

def read_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"// Could not read {path}: {str(e)}"

files = [
    'src/app/homework/page.tsx',
    'src/app/homework/[chapterId]/page.tsx',
    'src/components/HomeworkQuestionCard.tsx',
    'src/server/homework-catalog.ts'
]

with open('BATCH_3_PROMPT.md', 'w', encoding='utf-8') as out:
    out.write('# Batch 3 Prompt\n\n')
    out.write('Since you are using the same AI session, it already remembers the project, the paths, and the new UI style. You just need to give it the homework files and the new instructions.\n\n')
    
    out.write('## Copy and paste this single prompt:\n\n')
    out.write('```text\n')
    out.write('Batch 2 was perfect! Now let\'s move on to **Batch 3: Homework Restructuring**.\n\n')
    out.write('Here are the current files related to the homework functionality that you need to modify:\n\n')
    
    for f in files:
        out.write(f'--- BEGIN FILE: {f} ---\n{read_file(f)}\n--- END FILE: {f} ---\n\n')
    
    out.write('### 📦 BATCH 3: Homework Restructuring (Locked Logic & Grader UI)\n')
    out.write('1. **Homework Catalog Logic (`src/app/homework/page.tsx` & `src/server/homework-catalog.ts`)**\n')
    out.write('   - Right now, all homework is open to everyone immediately.\n')
    out.write('   - Implement **Locked Logic**: A user should NOT be able to click on or access a homework chapter unless they have completed the **reading** for that chapter\'s lesson (using `progress.readingIds`).\n')
    out.write('   - Show a clear "Locked" state in the UI for chapters they haven\'t read yet (e.g., greyed out, lock icon, "Read chapter to unlock").\n')
    out.write('   - Redesign the list of homework chapters to match the premium Dashboard UI (using the existing `batch-two.css` styles or adding a new `src/app/batch-three.css`).\n')
    out.write('2. **Homework Grader UI (`src/app/homework/[chapterId]/page.tsx` & `src/components/HomeworkQuestionCard.tsx`)**\n')
    out.write('   - The current `HomeworkQuestionCard` looks very basic (just a details/summary HTML element).\n')
    out.write('   - Redesign the grader UI to feel like a premium code-upload terminal or an interactive mission briefing.\n')
    out.write('   - Improve the display of the test results (Expected vs. Actual Output). It should look like a clean, color-coded terminal log (Green for Pass, Red for Fail) rather than basic HTML pre tags.\n')
    out.write('   - Show a prominent "Perfect Score" or "Completed" badge if `bestXp` equals `question.totalPoints`.\n')
    out.write('   - If you add new styles, please put them in a new file `src/app/batch-three.css` and import it.\n\n')
    
    out.write('Provide the complete updated code for the files you modify, and the new `batch-three.css`. Do NOT proceed to Batch 4 yet.\n')
    out.write('```\n')
