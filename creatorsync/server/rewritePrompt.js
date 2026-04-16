export const buildSB7Prompt = (title, content) => `Rewrite the user's rough idea or script into a polished YouTube script using the SB7 (StoryBrand 7) storytelling structure.

Requirements:
- Keep the original idea and meaning.
- Expand brief notes into a full, usable script if needed.
- Make it sound natural, conversational, and creator-friendly.
- Improve hooks, pacing, clarity, and emotional pull.
- Use these SB7 sections in this order:
  1. Hook
  2. Character / Goal
  3. Problem / Conflict
  4. Guide / Plan
  5. Action / Climax
  6. Payoff / Resolution
- Add short B-roll or shot suggestions in brackets where helpful.
- Do not explain the framework.
- Output only the rewritten script.

Title: ${title || 'Untitled Script'}

User idea / script:
${content}`;
