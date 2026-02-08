# fn-2-5on.2 Build chat components (ChatInterface, MessageList, MessageInput)

## Description

Implement core chat UI components with streaming message display using Vercel AI SDK useChat hook.

## Acceptance

- [ ] ChatInterface: Main container, uses useChat hook from 'ai' package
- [ ] useChat configured with api: '/api/chat', maintains last 5 messages automatically
- [ ] MessageList: Maps over messages, displays user/assistant messages
- [ ] Streaming text: Render message.content incrementally as chunks arrive
- [ ] SourceCitation: Parse and render markdown links `[Title](URL)` as clickable <a> tags
- [ ] MessageInput: Form with textarea + button, calls append() from useChat on submit
- [ ] Input clears after submission
- [ ] Messages scroll to bottom automatically on new message
- [ ] Loading state displayed while assistant is generating

## Implementation Notes

Use react-markdown or custom parser for citation links. Scroll container: `ref.current?.scrollIntoView({behavior: 'smooth'})` on new messages.

## Done summary
TBD

## Evidence
- Commits:
- Tests: Manual test with mock streaming response
- PRs:
