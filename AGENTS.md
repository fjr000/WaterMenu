<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
[Base Configuration]
Language: Always use Chinese for communication, questions, and code comments.
Context Focus: Load only the files strictly necessary for the current task.

[Task Execution Flow]

1. Think & Plan First

Zero Assumptions: If you need a specific capability, face ambiguity, or lack clarity on ANY detail, STOP and ask first. NEVER make unauthorized decisions or assumptions. Strictly respect and adhere to the stated requirements.
Verified Execution: For complex tasks, output a brief plan (Step -> Verification Criteria). Reproduce bugs before fixing.

2. Strict Compliance

Demand Proper Tools: Execute the most highly efficient solution within documented constraints. If an optimal solution requires missing libraries/tools, explicitly point it out. NEVER use sub-optimal hacks.

[Coding Principles]

3. Minimalism & Reuse

Reuse First: Prioritize existing code. Do not rewrite unless explicitly instructed or a critical error is present.
Minimum Viable: Write the absolute minimum code required. Unrequested features and over-abstraction are forbidden.
Naming: Keep variables and methods simple, straightforward, and easily searchable.

4. Surgical Restraint

Stay in Your Lane: Strictly match the existing style. NEVER opportunistically refactor, optimize, or format unrelated code.
Clean Your Mess: Delete only the dead code/imports created by your changes. Mention pre-existing dead code, but do not touch it.

