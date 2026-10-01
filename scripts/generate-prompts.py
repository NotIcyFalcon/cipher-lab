import os

def read_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"// Could not read {path}: {str(e)}"

files = {
    'css': ['src/app/workspace.css', 'src/app/globals.css'],
    'data': ['src/content/lessons.ts', 'src/content/paths.ts', 'src/lib/path-progress.ts'],
    'components': ['src/components/WorkspaceShell.tsx', 'src/components/LabTerminal.tsx', 'src/app/paths/page.tsx', 'src/components/LearningPage.tsx']
}

with open('BATCH_2_PROMPTS.md', 'w', encoding='utf-8') as out:
    out.write('# Batch 2 Prompts\n\n')
    out.write('To ensure the new AI keeps the "crazy UI" from Batch 1, it needs to see the CSS files and the updated components. Here are 3 prompts you can paste in sequence.\n\n')
    
    out.write('## PROMPT 1: Architecture & Styles\n')
    out.write('```text\n')
    out.write('I am building a Next.js cybersecurity learning platform called Cyber Box. I just completed Batch 1 of a massive UI refactor, and I need you to help me with Batch 2.\n\n')
    out.write('Please read the following context files representing my CSS and data structures. Do NOT write any code yet. Just reply "Styles and data absorbed."\n\n')
    for f in files['css'] + files['data']:
        out.write(f'--- BEGIN FILE: {f} ---\n{read_file(f)}\n--- END FILE: {f} ---\n\n')
    out.write('```\n\n')
    
    out.write('## PROMPT 2: Components & Pages\n')
    out.write('```text\n')
    out.write('Great. Now read the React components that we will be modifying or integrating with for Batch 2. Do NOT write any code yet. Just reply "Components absorbed, ready for instructions."\n\n')
    for f in files['components']:
        out.write(f'--- BEGIN FILE: {f} ---\n{read_file(f)}\n--- END FILE: {f} ---\n\n')
    out.write('```\n\n')
    
    out.write('## PROMPT 3: Batch 2 Instructions\n')
    out.write('```text\n')
    out.write('Please implement **Batch 2: Learning Paths & In-Lesson UI**.\n\n')
    out.write('Here are the requirements:\n\n')
    out.write('### 📦 BATCH 2: Learning Paths & In-Lesson Experience\n')
    out.write('1. **Learning Paths Page Revamp (`src/app/paths/page.tsx`)**\n')
    out.write('   - Use `getPathProgress()` from `src/lib/path-progress.ts` to get accurate points/XP instead of hardcoding it.\n')
    out.write('   - Add category groups (e.g., "Linux foundations", "Web Pentesting"). Group the paths by category in the UI.\n')
    out.write('   - Show unified points (mentioning how many points come specifically from the path\'s homework, reading, and labs).\n')
    out.write('   - Add an "expected days to finish" or time estimate.\n')
    out.write('   - Apply the new premium UI styling from `workspace.css` here to match the Dashboard.\n')
    out.write('2. **Inside the Lesson (The New Inner Sidebar in `src/components/LearningPage.tsx`)**\n')
    out.write('   - Create a dedicated *inner* sidebar layout for the `LearningPage`. Remove the old horizontal `.learning-chapter-strip` entirely.\n')
    out.write('   - Include a "Back to Learning Paths" button at the very top of this inner sidebar.\n')
    out.write('   - Below it, render a vertical Index of chapters/lessons with their titles and individual points.\n')
    out.write('   - **Color-coded states for the sidebar chapters:** \n')
    out.write('     - *Completed:* One color.\n')
    out.write('     - *Completed Reading but Unfinished Labs:* Show a yellow dot next to the name. Hovering over the dot must show a tooltip: "This lesson has unfinished labs".\n')
    out.write('     - *Ongoing / Current:* Highlighted clearly.\n')
    out.write('     - *Unvisited:* Locked color. Users cannot click to navigate to unvisited lessons, but they CAN click to jump back to any completed or ongoing lesson.\n')
    out.write('3. **Lesson Footer Navigation (`src/components/LearningPage.tsx`)**\n')
    out.write('   - At the bottom of the lesson content, add a premium bottom-navigation bar: "Go to Next Lesson", or if it\'s the last lesson, "Finish Path".\n')
    out.write('   - Clicking "Finish Path" should route the user back to the Learning Paths screen.\n')
    out.write('4. **Lab Terminal UI Tweaks (`src/components/LabTerminal.tsx` & `src/app/globals.css`)**\n')
    out.write('   - Fix the annoying scrollbar bug that sometimes appears on the right side of the xterm.js terminals (ensure `overflow: hidden` on the terminal screen wrapper in CSS/inline styles).\n')
    out.write('   - Above or near the terminal, clearly display how many points the lab is worth (currently 50 XP).\n')
    out.write('   - Redesign the "HINT" text/toggle (`<details>` in `LabBlock`) to look much more integrated, modern, and premium.\n\n')
    out.write('Provide the complete code for the files you modify. Do NOT proceed to Batch 3 yet. Provide your response as clearly marked file blocks.\n')
    out.write('```\n')
