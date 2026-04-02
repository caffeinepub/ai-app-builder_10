# AI App Builder

## Current State
- App has a dark IDE layout with Projects, Builder, Deploy, Settings views
- Builder shows AI chat, code editor, and live preview panels
- Users enter their OpenAI API key in Settings
- The `sendMessageToAI` backend function currently only stores user messages but does NOT actually call OpenAI — no AI responses are generated
- No output type selection exists; everything is treated as a generic HTML webpage
- No image or file upload support in the chat input

## Requested Changes (Diff)

### Add
- Output type selector when creating a new project: "Webpage", "Presentation" (reveal.js HTML slideshow), "App" (interactive web application)
- Each output type uses a different, highly detailed AI system prompt optimized for that type
- Image/file upload button in the chat input — supports drag-and-drop and click-to-upload images (PNG, JPG, GIF, WEBP) which are encoded to base64 and sent to OpenAI vision API
- Backend actually calls OpenAI GPT-4o (or gpt-4-vision-preview) via HTTP outcall, building the full conversation and returning generated HTML
- `outputType` field on Project stored as text ("webpage", "presentation", "app")
- Project cards show the output type badge
- AI system prompt is rich: instructs the model to produce complete, beautiful, self-contained single-file HTML with embedded CSS/JS tailored to the output type

### Modify
- `sendMessageToAI` backend function: implement real OpenAI API call, return updated project with both user message and AI assistant message appended
- `createProject` to accept `outputType` field
- `ProjectInput` type to include `outputType: Text`
- `Project` type to include `outputType: Text`
- `MessageInput` to include optional `imageBase64` field for image uploads
- BuilderPage chat input: add image upload button, show image thumbnails before sending
- ProjectsPage new project dialog: add output type selection with visual cards
- Builder center panel header: show output type tag; for presentations show "index.html (Reveal.js)", for apps show "app.html"

### Remove
- Nothing removed

## Implementation Plan
1. Update backend Motoko: add `outputType` to Project and ProjectInput, add optional `imageBase64` to MessageInput, implement OpenAI HTTP outcall in `sendMessageToAI` with per-type system prompts, append both user and assistant messages
2. Update frontend ProjectsPage: add output type selection cards in new project dialog
3. Update frontend BuilderPage: add image upload (file input + drag-and-drop), thumbnail preview strip, pass imageBase64 to backend call
4. Update project cards to show output type badge
5. Update frontend hooks to pass imageBase64 in mutation
