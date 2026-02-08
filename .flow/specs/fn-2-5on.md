# fn-2-5on Frontend: Chat UI & User Experience

## Overview

Build ChatGPT-like chat interface with streaming message display, source citations, conversation history, and Georgian College branding using Next.js 14 App Router, Tailwind CSS, and shadcn/ui components.

## Scope

**Core Components**:
- ChatInterface: Main container with useChat hook for streaming
- MessageList: Display messages with streaming support
- MessageInput: Text input with send button
- SourceCitation: Clickable markdown links to college pages

**Features**:
- Streaming text display (Vercel AI SDK)
- Source citations rendered as markdown links `[Page Title](URL)`
- Suggested starter questions
- Mobile responsive layout
- College branding (logo, colors, typography)

## Approach

**Phase 1: Next.js Setup**
1. Initialize project: `npx create-next-app@latest georgian-gpt --typescript --tailwind --app`
2. Install deps: ai, @ai-sdk/openai, @supabase/supabase-js, openai, replicate
3. Initialize shadcn/ui, add components: button, input, card, scroll-area

**Phase 2: Core Chat Components**
1. Build ChatInterface with useChat hook (maintains last 5 messages automatically)
2. Implement MessageList with streaming message display
3. Create MessageInput with form submission
4. Add SourceCitation component for rendering markdown citations

**Phase 3: Styling & UX**
1. Apply Georgian College branding (colors, logo, fonts)
2. Add suggested starter questions
3. Mobile responsive layout (Tailwind breakpoints)
4. Loading states and error messages

## Quick commands

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Test chat UI
open http://localhost:3000
```

## Acceptance

**Components**:
- [ ] ChatInterface uses useChat hook, maintains 5 messages
- [ ] MessageList displays streaming messages with proper formatting
- [ ] MessageInput has text input + send button, handles form submission
- [ ] SourceCitation renders `[Title](URL)` as clickable links

**Features**:
- [ ] Streaming text appears incrementally as chunks arrive
- [ ] Citations displayed inline after factual statements
- [ ] Suggested questions: "What programs does Georgian College offer?", "How do I apply?", "What services are available?"
- [ ] Mobile responsive (works on 375px+ screens)
- [ ] College branding applied (colors, logo in header)

**Quality**:
- [ ] Messages display correctly for both user and assistant
- [ ] Long messages scroll properly
- [ ] Input clears after submission
- [ ] Error states show user-friendly messages

## References

- PLAN.md Phase 3: Chat Frontend details
- Vercel AI SDK docs: https://sdk.vercel.ai/docs
- shadcn/ui components: https://ui.shadcn.com
