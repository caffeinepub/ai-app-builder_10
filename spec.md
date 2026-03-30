# AI App Builder

## Current State
New project. Empty Motoko backend and no frontend yet.

## Requested Changes (Diff)

### Add
- AI-powered chat interface where users describe what they want to build
- Live preview panel rendering generated HTML/CSS/JS in a sandboxed iframe
- Code editor panel showing AI-generated code (read/edit)
- Project management: create, list, save, and load projects
- API key configuration screen for connecting to an LLM (OpenAI-compatible)
- HTTP outcalls from backend to call external LLM APIs (OpenAI / compatible)
- Export/download project as a ZIP of HTML+CSS+JS files
- Authorization so users have their own projects
- Conversation history stored per project

### Modify
- N/A (new project)

### Remove
- N/A

## Implementation Plan
1. Select components: authorization, http-outcalls, blob-storage
2. Generate Motoko backend:
   - Projects CRUD (create, get, list, update, delete)
   - Messages stored per project (conversation history)
   - AI proxy: accepts user message + project context, calls LLM via http-outcalls, returns response
   - Store generated code (HTML/CSS/JS) per project
   - API key storage per user (encrypted in stable storage)
3. Build React frontend:
   - Dark IDE-style layout matching design preview
   - Left nav rail with icons: Projects, Build, Code, Preview, Settings
   - Projects panel: list of saved projects, create new
   - Build view: three-panel layout
     - Left: AI chat with message history, input box
     - Center: code editor (Monaco or textarea with syntax highlight)
     - Right: live preview iframe (srcdoc sandboxed)
   - Settings: API key input
   - Export/download button
