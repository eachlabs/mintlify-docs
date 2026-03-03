# Eachlabs Sense API - Frontend Integration Guide

**Base URL:** `https://sense.eachlabs.run`

---

## Table of Contents

- [Authentication](#authentication)
- [Endpoints Overview](#endpoints-overview)
- [POST /chat — Main Chat Endpoint](#post-chat)
  - [Request Schema](#chat-request-schema)
  - [Streaming Response (SSE)](#streaming-response-sse)
  - [Non-Streaming Response (JSON)](#non-streaming-response-json)
- [POST /workflow — Workflow Builder Endpoint](#post-workflow)
  - [Request Schema](#workflow-request-schema)
  - [Streaming Response (SSE)](#workflow-streaming-response)
  - [Non-Streaming Response (JSON)](#workflow-non-streaming-response)
- [GET /memory — Session Memory](#get-memory)
- [DELETE /memory — Clear Memory](#delete-memory)
- [GET /sessions — List Sessions](#get-sessions)
- [GET /health — Health Check](#get-health)
- [SSE Event Types Reference](#sse-event-types-reference)
- [Use Case Flows](#use-case-flows)
- [Error Handling](#error-handling)
- [Frontend Implementation Examples](#frontend-implementation-examples)

---

## Authentication

All endpoints that perform AI operations require an API key via the `X-API-Key` header.

```
X-API-Key: your-api-key-here
```

If the key is missing or invalid, the API returns:

```json
{ "detail": "API key is required." }
```

**HTTP Status:** `401 Unauthorized`

---

## Endpoints Overview

| Method | Path | Description | Auth Required |
|--------|------|-------------|--------------|
| `POST` | `/chat` | Main chat endpoint (generation, text, workflows) | Yes |
| `POST` | `/workflow` | Dedicated workflow builder | Yes |
| `GET` | `/memory` | Get session conversation memory | No |
| `DELETE` | `/memory` | Clear session memory | No |
| `GET` | `/sessions` | List all active sessions | No |
| `GET` | `/health` | Health check | No |
| `GET` | `/` | API info | No |

---

## POST /chat

The unified chat endpoint. The AI agent decides what to do based on the user's message: generate images/videos, build workflows, search the web, return text, or ask clarification questions.

### Chat Request Schema

```json
POST https://sense.eachlabs.run/chat
Content-Type: application/json
X-API-Key: your-api-key

{
  "message": "Generate a portrait of a woman in cinematic lighting",
  "session_id": "optional-uuid",
  "stream": true,
  "mode": "max",
  "behavior": "agent",
  "image_urls": ["https://example.com/photo.jpg"],
  "workflow_id": "optional-workflow-uuid",
  "version_id": "optional-version-id",
  "web_search": true
}
```

#### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `message` | `string` | **Yes** | — | The user's message or request |
| `session_id` | `string` | No | `null` | Session ID for multi-turn conversations. Pass the same ID to maintain context across requests. If omitted, a new session is created. |
| `stream` | `boolean` | No | `true` | `true` for SSE streaming, `false` for JSON response |
| `mode` | `string` | No | `"max"` | Quality mode: `"max"` (premium models) or `"eco"` (budget models) |
| `behavior` | `string` | No | `"agent"` | Behavior mode (see below) |
| `image_urls` | `string[]` | No | `null` | Array of image URLs for editing/processing tasks |
| `workflow_id` | `string` | No | `null` | Workflow UUID — enables workflow building mode |
| `version_id` | `string` | No | `null` | Required when `workflow_id` is provided |
| `web_search` | `boolean` | No | `true` | Enable/disable web search capability |

#### Quality Modes (`mode`)

| Value | Description |
|-------|-------------|
| `"max"` | Uses premium, highest-quality models. Better results, higher cost. |
| `"eco"` | Uses cost-effective alternative models. Faster, lower cost, slightly lower quality. |

#### Behavior Modes (`behavior`)

| Value | Description | When to use |
|-------|-------------|-------------|
| `"agent"` | Auto-executes the best approach. Asks clarification only for complex business requests. | Default — best for most users |
| `"plan"` | Presents a structured TODO plan before executing. Never executes without approval. | When user wants to review steps first |
| `"ask"` | Always asks clarification questions before any action. | When user wants full control |

---

### Streaming Response (SSE)

When `stream: true` (default), the response is a `text/event-stream` with the following headers:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

Each event is a line in the format:

```
data: {"type": "event_type", ...fields}\n\n
```

The stream ends with:

```
data: [DONE]\n\n
```

#### SSE Event Types for /chat

The frontend must handle ALL of the following event types:

---

##### `thinking_delta`

Claude's reasoning streamed in real-time (extended thinking). Show as a collapsible "thinking" indicator.

```json
{"type": "thinking_delta", "content": "Let me analyze this request..."}
```

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | Chunk of thinking text (streamed incrementally) |

**Frontend handling:** Append to a thinking/reasoning UI element. These arrive as small chunks — concatenate them. Can be hidden or shown in a collapsible section.

---

##### `status`

Current action being performed by the agent. Show as a loading indicator.

```json
{
  "type": "status",
  "message": "Searching for the best image generation model...",
  "tool_name": "search_models",
  "parameters": {"use_case": "text to image portrait"}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Human-readable status message |
| `tool_name` | `string` | Internal tool name (optional, for debugging) |
| `parameters` | `object` | Tool parameters (optional) |

**Frontend handling:** Display as a loading/progress indicator. Replace previous status message with each new one.

---

##### `progress`

Progress update messages during multi-step operations.

```json
{"type": "progress", "message": "Generating image 2 of 3..."}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Progress description |

**Frontend handling:** Same as `status` — update the loading indicator.

---

##### `text_response`

Text content from the AI agent. This is the main conversational response.

```json
{"type": "text_response", "content": "Here's what I found about AI image generation..."}
```

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | The full text response |

**Frontend handling:** Display as a chat message from the AI. Supports markdown formatting. This is the **primary response type** for text/informational answers and plan mode responses.

---

##### `message`

Conversational text from the agent during tool execution. The agent talks to the user while working.

```json
{"type": "message", "content": "Great choice! Let me find the perfect model for your portrait..."}
```

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | Conversational text |

**Frontend handling:** Display as inline chat text. These appear **during** the generation process (between tool calls) to keep the conversation interactive. Append to the chat, don't replace previous messages.

---

##### `generation_response`

A generated media URL (image or video). This is the main output for content generation.

```json
{
  "type": "generation_response",
  "url": "https://cdn.eachlabs.ai/generated/abc123.png",
  "generations": ["https://cdn.eachlabs.ai/generated/abc123.png"],
  "total": 1,
  "tool_name": "execute_model",
  "model": "nano-banana-pro"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | The newly generated media URL |
| `generations` | `string[]` | Cumulative array of all generated URLs so far |
| `total` | `number` | Total count of generations so far |
| `tool_name` | `string` | Which tool produced this (optional) |
| `model` | `string` | Model used for generation (optional) |

**Frontend handling:** Display the generated image/video immediately. Use the `url` field for the new item. The `generations` array contains ALL URLs generated so far in this request (useful if the user asked for multiple images). Detect media type by URL extension or content:
- `.png`, `.jpg`, `.jpeg`, `.webp` → render as `<img>`
- `.mp4`, `.webm` → render as `<video>`

---

##### `clarification_needed`

The agent needs more information from the user. Display as an interactive question.

```json
{
  "type": "clarification_needed",
  "question": "I'd love to create a UGC ad for your burger house! To make it perfect, I need a few details:",
  "options": [
    "What's the name of your restaurant?",
    "Do you have a photo of your signature burger?",
    "Who is your target audience?"
  ],
  "context": "Creating effective UGC ads requires specific business details for authenticity."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `question` | `string` | The question to display to the user |
| `options` | `string[]` | Optional suggested options/choices (may be empty `[]`) |
| `context` | `string` | Optional context explaining why this info is needed (may be empty `""`) |

**Frontend handling:**
- Display the `question` as a chat message from the AI
- If `options` array is non-empty, render them as clickable buttons or chips the user can select
- If `context` is non-empty, show it as a subtitle or helper text
- The user's response should be sent as a new `/chat` request with the **same `session_id`** to continue the conversation

---

##### `web_search_query`

A web search is being performed. Show as a search indicator.

```json
{
  "type": "web_search_query",
  "query": "best AI image generation models 2025",
  "recency": "month"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `query` | `string` | The search query |
| `recency` | `string\|null` | Recency filter: `"day"`, `"week"`, `"month"`, `"year"`, or `null` |

**Frontend handling:** Show a "Searching the web..." indicator with the query text.

---

##### `web_search_citations`

Citations from web search results.

```json
{
  "type": "web_search_citations",
  "citations": [
    "https://example.com/article-1",
    "https://example.com/article-2"
  ],
  "count": 2
}
```

| Field | Type | Description |
|-------|------|-------------|
| `citations` | `string[]` | Array of source URLs |
| `count` | `number` | Number of citations |

**Frontend handling:** Display citations as clickable links, either inline with the response or in a "Sources" section.

---

##### `workflow_fetched`

An existing workflow has been loaded (only when `workflow_id` is provided).

```json
{
  "type": "workflow_fetched",
  "workflow_name": "UGC Ad Generator",
  "existing_steps": 3,
  "existing_definition": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `workflow_name` | `string` | Name of the workflow |
| `existing_steps` | `number` | Number of existing steps |
| `existing_definition` | `object\|null` | The current workflow definition |

**Frontend handling:** Show a brief notification like "Loaded workflow: UGC Ad Generator (3 steps)".

---

##### `workflow_built`

A workflow definition has been constructed (before pushing to API).

```json
{
  "type": "workflow_built",
  "steps_count": 4,
  "definition": {
    "version": "v1",
    "input_schema": { ... },
    "steps": [ ... ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `steps_count` | `number` | Number of steps in the workflow |
| `definition` | `object` | The complete workflow definition |

**Frontend handling:** Can show a preview of the workflow structure. Optional — may just show a status message.

---

##### `workflow_updated`

A workflow has been successfully pushed to the Eachlabs API.

```json
{
  "type": "workflow_updated",
  "success": true,
  "workflow_id": "abc-123-def",
  "version_id": "v1",
  "definition": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the update succeeded |
| `workflow_id` | `string` | The workflow UUID |
| `version_id` | `string` | The version ID |
| `definition` | `object` | The final workflow definition |

**Frontend handling:** Show success confirmation. May want to refresh the workflow editor/preview with the new definition.

---

##### `tool_call`

Internal tool call details (optional, for debugging or advanced UIs).

```json
{
  "type": "tool_call",
  "name": "search_models",
  "input": {"use_case": "text to image portrait"}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Tool name |
| `input` | `object` | Tool input parameters |

**Frontend handling:** Optional. Can be shown in a debug/developer panel or ignored entirely.

---

##### `complete`

Final event indicating the request is done. Always arrives before `[DONE]`.

```json
{
  "type": "complete",
  "task_id": null,
  "status": "ok",
  "tool_calls": ["search_models", "get_model_details", "execute_model"],
  "generations": ["https://cdn.eachlabs.ai/generated/abc123.png"],
  "model": "nano-banana-pro",
  "workflow_id": "abc-123-def",
  "version_id": "v1"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | `string\|null` | Task identifier |
| `status` | `string` | `"ok"` or `"error"` |
| `tool_calls` | `string[]` | List of tools that were called during this request |
| `generations` | `string[]` | All generated media URLs (optional, only if media was generated) |
| `model` | `string` | Model used (optional) |
| `workflow_id` | `string` | Workflow ID (optional, only in workflow mode) |
| `version_id` | `string` | Version ID (optional, only in workflow mode) |

**Frontend handling:** Mark the request as complete. Stop showing loading indicators. The `generations` array is the definitive list of all generated media.

---

##### `error`

An error occurred during processing.

```json
{
  "type": "error",
  "message": "Model execution failed: invalid input parameter 'style'"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Error description |

**Frontend handling:** Display an error message to the user. The stream will end after this event. Stop loading indicators.

---

##### `[DONE]`

Stream termination signal. Not a JSON event.

```
data: [DONE]
```

**Frontend handling:** Close the EventSource/SSE connection. This is the final signal — no more events will arrive.

---

### Non-Streaming Response (JSON)

When `stream: false`, the response is a single JSON object.

#### Success — Generation

```json
{
  "task_id": null,
  "status": "ok",
  "generations": ["https://cdn.eachlabs.ai/generated/abc123.png"],
  "model": "nano-banana-pro"
}
```

#### Success — Text Response

```json
{
  "task_id": null,
  "status": "ok",
  "text_response": "Here's what I found about AI image generation..."
}
```

#### Success — Clarification Needed

```json
{
  "success": true,
  "clarification_needed": true,
  "question": "What style would you like for your portrait?",
  "options": ["Photorealistic", "Anime", "Oil painting", "Watercolor"],
  "context": "Different styles require different models."
}
```

#### Success — Workflow Updated

```json
{
  "success": true,
  "workflow_id": "abc-123-def",
  "version_id": "v1",
  "definition": { ... }
}
```

#### Error

```json
HTTP 401: {"detail": "API key is required."}
HTTP 500: {"detail": "Model execution failed"}
HTTP 503: {"detail": "ChatAgent not available"}
```

---

## POST /workflow

Dedicated workflow builder endpoint for creating/updating AI workflows. Use this when you want to **only** build workflows without direct generation capabilities.

> **Note:** The `/chat` endpoint with `workflow_id` parameter provides the same workflow building capability plus all other features. Use `/workflow` when you want a simpler, workflow-focused interface.

### Workflow Request Schema

```json
POST https://sense.eachlabs.run/workflow
Content-Type: application/json
X-API-Key: your-api-key

{
  "workflow_id": "abc-123-def-456",
  "version_id": "v1",
  "message": "Build a UGC ad generator workflow for TikTok",
  "session_id": "optional-uuid",
  "stream": true,
  "web_search": true,
  "image_urls": ["https://example.com/product.jpg"]
}
```

#### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workflow_id` | `string` | **Yes** | — | UUID of the workflow to create/update |
| `version_id` | `string` | **Yes** | — | Version identifier (e.g., `"v1"`) |
| `message` | `string` | **Yes** | — | User's workflow building request |
| `session_id` | `string` | No | `null` | Session ID for multi-turn conversation |
| `stream` | `boolean` | No | `true` | `true` for SSE, `false` for JSON |
| `web_search` | `boolean` | No | `true` | Enable web search for model/technique research |
| `image_urls` | `string[]` | No | `null` | Reference images for the workflow |

### Workflow Streaming Response

Same SSE format as `/chat`. Event types specific to `/workflow`:

| Event Type | Description |
|------------|-------------|
| `thinking_delta` | Agent reasoning chunks |
| `status` | Current action description |
| `progress` | Progress updates |
| `web_search_query` | Web search being executed |
| `web_search_citations` | Citations from search results |
| `workflow_fetched` | Existing workflow loaded |
| `model_lookup` | Looking up model details |
| `clarification_needed` | Agent needs more info |
| `workflow_built` | Definition constructed |
| `workflow_updated` | Successfully pushed to API |
| `tool_call` | Internal tool call (debug) |
| `message` | Informational text from agent |
| `complete` | Final result |
| `error` | Error occurred |

##### `model_lookup` (workflow-only event)

```json
{"type": "model_lookup", "model": "nano-banana-pro"}
```

##### `complete` (workflow response)

```json
{
  "type": "complete",
  "workflow_id": "abc-123-def",
  "version_id": "v1",
  "steps_count": 4,
  "input_fields": ["product_name", "target_audience", "product_image"]
}
```

### Workflow Non-Streaming Response

#### Success — Workflow Updated

```json
{
  "success": true,
  "workflow_id": "abc-123-def",
  "version_id": "v1",
  "definition": { ... }
}
```

#### Success — Clarification Needed

```json
{
  "success": true,
  "clarification_needed": true,
  "question": "What platform is this workflow targeting?",
  "options": ["TikTok", "Instagram Reels", "YouTube Shorts"],
  "context": "Platform determines aspect ratio and duration."
}
```

---

## GET /memory

Get conversation memory for a session.

```
GET https://sense.eachlabs.run/memory?session_id=your-session-id
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | `string` | No | Session ID. If omitted, returns default session. |

#### Response

```json
{
  "exchanges": [
    {
      "user": "Generate a sunset photo",
      "assistant": "Created a beautiful sunset...",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "generated_urls": [
    "https://cdn.eachlabs.ai/generated/abc123.png"
  ]
}
```

---

## DELETE /memory

Clear conversation memory for a session.

```
DELETE https://sense.eachlabs.run/memory?session_id=your-session-id
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | `string` | No | Session ID to clear. If omitted, clears default session. |

#### Response

```json
{
  "cleared": true,
  "session_id": "your-session-id"
}
```

---

## GET /sessions

List all active sessions that have conversation memory.

```
GET https://sense.eachlabs.run/sessions
```

#### Response

```json
{
  "sessions": ["session-1-uuid", "session-2-uuid", "session-3-uuid"]
}
```

---

## GET /health

```
GET https://sense.eachlabs.run/health
```

#### Response

```json
{"status": "healthy"}
```

---

## SSE Event Types Reference

Quick reference table of all SSE event types across both endpoints.

| Event Type | /chat | /workflow | Terminal | Description |
|------------|-------|-----------|----------|-------------|
| `thinking_delta` | Yes | Yes | No | AI reasoning chunks |
| `status` | Yes | Yes | No | Current action/tool status |
| `progress` | Yes | Yes | No | Progress updates |
| `message` | Yes | Yes | No | Conversational text from agent |
| `text_response` | Yes | No | Yes | Full text response |
| `generation_response` | Yes | No | Yes | Generated media URL |
| `clarification_needed` | Yes | Yes | Yes | Agent needs user input |
| `web_search_query` | Yes | Yes | No | Web search in progress |
| `web_search_citations` | Yes | Yes | No | Web search sources |
| `workflow_fetched` | Yes | Yes | No | Existing workflow loaded |
| `workflow_built` | Yes | Yes | No | Workflow definition ready |
| `workflow_updated` | Yes | Yes | Yes | Workflow pushed to API |
| `model_lookup` | No | Yes | No | Model details lookup |
| `tool_call` | Yes | Yes | No | Internal tool call (debug) |
| `complete` | Yes | Yes | Yes | Request finished |
| `error` | Yes | Yes | Yes | Error occurred |
| `[DONE]` | Yes | Yes | Yes | Stream ended |

---

## Use Case Flows

### Flow 1: Image Generation (Direct)

```
User: "Generate a portrait of a woman"
Mode: agent, max

Events received:
1. message       → "I'd love to create a beautiful portrait for you! Let me find the perfect model..."
2. status        → "Searching for the best image generation model..."
3. status        → "Getting model details for image generation..."
4. message       → "Found a great model! Generating your portrait with cinematic lighting..."
5. status        → "Generating your image..."
6. generation_response → { url: "https://...", generations: ["https://..."], total: 1 }
7. complete      → { status: "ok", generations: ["https://..."] }
8. [DONE]
```

### Flow 2: Text/Information Response

```
User: "What is AI image generation?"
Mode: agent, max

Events received:
1. message       → "Great question! Let me explain..."
2. text_response → { content: "AI image generation is a technology that..." }
3. complete      → { status: "ok" }
4. [DONE]
```

### Flow 3: Clarification (Business Request)

```
User: "Create a UGC ad for my burger restaurant"
Mode: agent, max

Events received:
1. clarification_needed → {
     question: "I'd love to create an awesome UGC ad for your restaurant!...",
     options: ["What's the restaurant name?", "Do you have a burger photo?", ...],
     context: "UGC ads work best with real business details."
   }
2. complete      → { status: "ok" }
3. [DONE]

--- User responds with details (same session_id) ---

User: "It's called Burger Palace, here's our signature burger photo"
session_id: same-session-id

Events received:
1. message       → "Burger Palace sounds delicious! Let me create your ad..."
2. status        → "Searching for models..."
3. ...
4. generation_response → { url: "https://..." }
5. complete      → { status: "ok" }
6. [DONE]
```

### Flow 4: Plan Mode

```
User: "Create a UGC ad for my clothing brand"
Mode: plan, max

Events received:
1. text_response → {
     content: "Here's my plan for your UGC ad:\n\n
     **What I need from you:**\n
     - Brand name and logo\n
     - Product photos\n
     - Target audience\n\n
     **Steps:**\n
     1. Write a hook-driven UGC script\n
     2. Generate realistic presenter image\n
     3. Create voiceover\n
     4. Animate with lip-sync\n\n
     **Output:** 9:16 vertical, 15s, authentic style\n\n
     Should I proceed once you provide the details?"
   }
2. complete      → { status: "ok" }
3. [DONE]
```

### Flow 5: Workflow Building

```
User: "Build a product photo generator"
workflow_id: "abc-123", version_id: "v1"
Mode: agent, max

Events received:
1. workflow_fetched → { workflow_name: "Untitled", existing_steps: 0 }
2. message       → "I'll build a product photo generator workflow for you..."
3. status        → "Searching for image generation models..."
4. status        → "Getting model details..."
5. message       → "Building your workflow with smart input fields..."
6. workflow_built → { steps_count: 2, definition: {...} }
7. workflow_updated → { success: true, workflow_id: "abc-123", definition: {...} }
8. complete      → { workflow_id: "abc-123", version_id: "v1", steps_count: 2 }
9. [DONE]
```

### Flow 6: Multiple Images

```
User: "Generate 3 different sunset photos"
Mode: agent, max

Events received:
1. message       → "I'll create 3 unique sunset photos for you!"
2. status        → "Searching for models..."
3. status        → "Getting model details..."
4. message       → "Generating sunset 1 of 3..."
5. generation_response → { url: "https://...1.png", generations: ["...1"], total: 1 }
6. message       → "Generating sunset 2 of 3..."
7. generation_response → { url: "https://...2.png", generations: ["...1", "...2"], total: 2 }
8. message       → "Generating sunset 3 of 3..."
9. generation_response → { url: "https://...3.png", generations: ["...1", "...2", "...3"], total: 3 }
10. complete     → { status: "ok", generations: ["...1", "...2", "...3"] }
11. [DONE]
```

### Flow 7: Image Editing with Upload

```
User: "Remove the background from this image"
image_urls: ["https://example.com/photo.jpg"]
Mode: agent, max

Events received:
1. message       → "I'll remove the background from your image right away!"
2. status        → "Searching for background removal models..."
3. status        → "Getting model details..."
4. status        → "Processing your image..."
5. generation_response → { url: "https://...transparent.png", total: 1 }
6. complete      → { status: "ok", generations: ["https://...transparent.png"] }
7. [DONE]
```

### Flow 8: Web Search

```
User: "What are the latest AI video generation models?"
web_search: true, Mode: agent, max

Events received:
1. message       → "Let me search for the latest information..."
2. web_search_query → { query: "latest AI video generation models 2025", recency: "month" }
3. web_search_citations → { citations: ["https://...", "https://..."], count: 2 }
4. text_response → { content: "Based on my research, the latest models include..." }
5. complete      → { status: "ok" }
6. [DONE]
```

### Flow 9: Ask Mode

```
User: "Generate a portrait"
Mode: ask, max

Events received:
1. clarification_needed → {
     question: "I'd love to create a portrait for you! Let me ask a few questions first:",
     options: ["Photorealistic or artistic?", "Male or female?", "Any specific mood or lighting?"],
     context: ""
   }
2. complete      → { status: "ok" }
3. [DONE]
```

### Flow 10: Error During Generation

```
Events received:
1. message       → "Let me create that for you..."
2. status        → "Searching for models..."
3. error         → { message: "Model execution failed: timeout" }
4. [DONE]
```

---

## Error Handling

### HTTP Errors

| Status | Cause | Response |
|--------|-------|----------|
| `401` | Missing or invalid API key | `{"detail": "API key is required."}` |
| `500` | Server error during processing | `{"detail": "error description"}` |
| `503` | ChatAgent or WorkflowBuilder not available | `{"detail": "ChatAgent not available"}` |

### SSE Error Events

Errors can also arrive as SSE events during streaming:

```json
{"type": "error", "message": "Model execution failed: invalid input"}
```

After an `error` event, the stream will terminate with `[DONE]`.

### Frontend Error Handling Checklist

1. **Check HTTP status** before starting SSE parsing — handle 401, 500, 503
2. **Listen for `error` events** in the SSE stream
3. **Handle connection drops** — if the connection closes without `[DONE]`, show a reconnect option
4. **Timeout handling** — if no events arrive for 60+ seconds, show a timeout message
5. **Parse errors** — if `data:` contains invalid JSON (except `[DONE]`), skip the event

---

## Frontend Implementation Examples

### JavaScript/TypeScript — SSE Client

```typescript
interface ChatRequest {
  message: string;
  session_id?: string;
  stream?: boolean;
  mode?: "max" | "eco";
  behavior?: "agent" | "plan" | "ask";
  image_urls?: string[];
  workflow_id?: string;
  version_id?: string;
  web_search?: boolean;
}

interface SSEEvent {
  type: string;
  [key: string]: any;
}

async function chatStream(
  request: ChatRequest,
  apiKey: string,
  onEvent: (event: SSEEvent) => void,
  onDone: () => void,
  onError: (error: Error) => void
) {
  try {
    const response = await fetch("https://sense.eachlabs.run/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const error = await response.json();
      onError(new Error(error.detail || `HTTP ${response.status}`));
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6); // Remove "data: "

        if (data === "[DONE]") {
          onDone();
          return;
        }

        try {
          const event: SSEEvent = JSON.parse(data);
          onEvent(event);
        } catch {
          // Skip non-JSON lines
        }
      }
    }

    onDone();
  } catch (error) {
    onError(error as Error);
  }
}
```

### React Hook Example

```typescript
import { useState, useCallback } from "react";

interface ChatState {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  generations: string[];
  isLoading: boolean;
  isThinking: boolean;
  thinkingText: string;
  statusMessage: string;
  clarification: {
    question: string;
    options: string[];
    context: string;
  } | null;
  error: string | null;
}

function useSenseChat(apiKey: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    generations: [],
    isLoading: false,
    isThinking: false,
    thinkingText: "",
    statusMessage: "",
    clarification: null,
    error: null,
  });

  const [sessionId] = useState(() => crypto.randomUUID());

  const sendMessage = useCallback(
    async (
      message: string,
      options?: {
        mode?: "max" | "eco";
        behavior?: "agent" | "plan" | "ask";
        imageUrls?: string[];
        workflowId?: string;
        versionId?: string;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        clarification: null,
        statusMessage: "",
        thinkingText: "",
        messages: [
          ...prev.messages,
          { role: "user", content: message },
        ],
      }));

      await chatStream(
        {
          message,
          session_id: sessionId,
          mode: options?.mode || "max",
          behavior: options?.behavior || "agent",
          image_urls: options?.imageUrls,
          workflow_id: options?.workflowId,
          version_id: options?.versionId,
        },
        apiKey,
        // onEvent
        (event) => {
          switch (event.type) {
            case "thinking_delta":
              setState((prev) => ({
                ...prev,
                isThinking: true,
                thinkingText: prev.thinkingText + event.content,
              }));
              break;

            case "status":
            case "progress":
              setState((prev) => ({
                ...prev,
                isThinking: false,
                statusMessage: event.message,
              }));
              break;

            case "message":
              setState((prev) => ({
                ...prev,
                messages: [
                  ...prev.messages,
                  { role: "assistant", content: event.content },
                ],
              }));
              break;

            case "text_response":
              setState((prev) => ({
                ...prev,
                messages: [
                  ...prev.messages,
                  { role: "assistant", content: event.content },
                ],
              }));
              break;

            case "generation_response":
              setState((prev) => ({
                ...prev,
                generations: event.generations,
              }));
              break;

            case "clarification_needed":
              setState((prev) => ({
                ...prev,
                clarification: {
                  question: event.question,
                  options: event.options || [],
                  context: event.context || "",
                },
                messages: [
                  ...prev.messages,
                  { role: "assistant", content: event.question },
                ],
              }));
              break;

            case "workflow_updated":
              setState((prev) => ({
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    role: "assistant",
                    content: event.success
                      ? "Workflow updated successfully!"
                      : "Workflow update failed.",
                  },
                ],
              }));
              break;

            case "error":
              setState((prev) => ({
                ...prev,
                error: event.message,
              }));
              break;
          }
        },
        // onDone
        () => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isThinking: false,
            statusMessage: "",
          }));
        },
        // onError
        (error) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isThinking: false,
            error: error.message,
          }));
        }
      );
    },
    [apiKey, sessionId]
  );

  return { ...state, sendMessage, sessionId };
}
```

### Event Handling Decision Tree

```
Receive SSE event
  |
  ├── type === "[DONE]"
  │     └── Close connection, stop loading
  │
  ├── type === "thinking_delta"
  │     └── Append to thinking indicator (collapsible)
  │
  ├── type === "status" or "progress"
  │     └── Update loading indicator text
  │
  ├── type === "message"
  │     └── Append to chat as assistant message (inline, during generation)
  │
  ├── type === "text_response"
  │     └── Display as main assistant response (markdown)
  │
  ├── type === "generation_response"
  │     └── Render media (image/video) + update generations array
  │
  ├── type === "clarification_needed"
  │     └── Show question + render option buttons + wait for user input
  │
  ├── type === "web_search_query"
  │     └── Show "Searching: {query}..." indicator
  │
  ├── type === "web_search_citations"
  │     └── Store citations for display with response
  │
  ├── type === "workflow_fetched"
  │     └── Show "Loaded workflow: {name}" notification
  │
  ├── type === "workflow_built"
  │     └── Optional: preview workflow definition
  │
  ├── type === "workflow_updated"
  │     └── Show success/failure + refresh workflow editor
  │
  ├── type === "tool_call"
  │     └── Optional: show in debug panel
  │
  ├── type === "complete"
  │     └── Finalize UI, use generations array as definitive media list
  │
  └── type === "error"
        └── Show error message, stop loading
```

---

## Multi-Turn Conversation (Session Memory)

To maintain conversation context across multiple requests, always pass the same `session_id`.

```
Request 1: { message: "Generate a sunset", session_id: "abc-123" }
  → Agent generates sunset image

Request 2: { message: "Make it more dramatic", session_id: "abc-123" }
  → Agent remembers the previous request and context

Request 3: { message: "Now create a video version", session_id: "abc-123" }
  → Agent uses context from both previous requests
```

The server stores the last 5 exchanges per session (max 100 concurrent sessions, LRU eviction).

**Important:** Always generate a `session_id` client-side (e.g., `crypto.randomUUID()`) and reuse it for the entire conversation. If omitted, each request starts fresh with no memory.

---

## Workflow Mode via /chat

When `workflow_id` and `version_id` are provided in the `/chat` request, the agent enters **workflow building mode**. In this mode, the `build_workflow` tool becomes available, and the agent can construct multi-step AI pipelines.

```json
{
  "message": "Build a UGC ad generator with voiceover and lip-sync",
  "workflow_id": "abc-123-def-456",
  "version_id": "v1",
  "session_id": "session-uuid"
}
```

The agent will:
1. Fetch the existing workflow definition
2. Search for appropriate models
3. Design the workflow with smart input fields
4. Push the definition to the Eachlabs API
5. Return the complete definition

You'll receive `workflow_fetched`, `workflow_built`, and `workflow_updated` events during this process.

---

## Content Type Detection

When displaying generated media from `generation_response` events, detect the content type:

```typescript
function getMediaType(url: string): "image" | "video" | "unknown" {
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0];
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")) return "image";
  if (["mp4", "webm", "mov"].includes(ext || "")) return "video";
  return "unknown";
}
```

For unknown types, you can make a `HEAD` request to check the `Content-Type` header, or default to rendering as an image.
