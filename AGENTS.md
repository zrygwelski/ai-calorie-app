<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Working Style

- Make changes only when explicitly asked. When asked to analyze, review, recommend, or explain, do not modify files.

- For significant changes, explain the proposed approach and files that would be changed before implementing them.

- Prefer small, incremental changes over large refactors.

- Preserve existing functionality unless the requested change specifically requires changing it.

- Preserve the existing Calorie Club visual design and styling conventions. New UI should feel consistent with the existing application.

- Consider both desktop and mobile/iPhone layouts for UI changes.

- Do not introduce new dependencies, services, databases, authentication, or other architectural complexity unless specifically requested or clearly necessary. Explain the tradeoffs before doing so.

- Keep user data mutations flowing through the existing state/persistence patterns.

- Never expose, log, commit, or modify secrets such as `OPENAI_API_KEY` or `.env.local`.

- After making code changes, run the appropriate checks available in the project and report any errors.

- When a requested change could be implemented in multiple reasonable ways, briefly explain the options and recommend one before making a significant architectural decision.