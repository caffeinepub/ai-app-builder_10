# AI App Builder

## Current State
- Users can enter a single OpenAI API key in Settings
- The backend stores one API key per user (keyed to their Principal)
- The `sendMessageToAI` function exclusively calls OpenAI's GPT-4o model
- Settings page only shows an OpenAI API key input

## Requested Changes (Diff)

### Add
- Support for multiple AI provider API keys per user: OpenAI, Anthropic (Claude), and Google (Gemini)
- Backend stores separate API keys per provider per user
- AI provider selection in the Settings page (select active provider)
- Settings page now shows three separate API key input fields (one per provider)
- Active provider selector stored in backend per user
- Backend routes `sendMessageToAI` calls to the selected provider's API endpoint

### Modify
- Backend: `setApiKey` / `getApiKey` replaced with `setProviderApiKey(provider, key)` / `getProviderApiKeys()` / `setActiveProvider(provider)` / `getActiveProvider()`
- `sendMessageToAI` checks active provider and routes to correct API (OpenAI, Anthropic, or Google Gemini)
- Settings page: redesigned to show all three providers with individual key inputs + active provider radio/toggle
- `MessageInput` optionally carries provider override (or rely on stored active provider)
- `backend.d.ts` updated to reflect new API shape

### Remove
- Single `setApiKey` / `getApiKey` pattern (replaced by per-provider pattern)

## Implementation Plan
1. Update `main.mo`:
   - Add `apiKeysByProvider` map: `Map<Principal, Map<Text, Text>>` (principal -> provider -> key)
   - Add `activeProvider` map: `Map<Principal, Text>` (principal -> "openai" | "anthropic" | "google")
   - Add `setProviderApiKey(provider: Text, key: Text)` update function
   - Add `getProviderApiKeys()` query returns `{openai: ?Text, anthropic: ?Text, google: ?Text}`
   - Add `setActiveProvider(provider: Text)` update function
   - Add `getActiveProvider()` query returns `?Text`
   - Keep backward-compat `setApiKey` / `getApiKey` mapping to OpenAI provider
   - Route `sendMessageToAI` based on active provider: OpenAI uses existing logic, Anthropic calls `https://api.anthropic.com/v1/messages`, Google calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
2. Regenerate `backend.d.ts` bindings for new API shape
3. Update `useQueries.ts` to add hooks for new provider key functions
4. Update `SettingsPage.tsx` to show three provider cards with individual inputs + active provider selection
5. Validate and build
