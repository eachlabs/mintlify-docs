# API Endpoints

Complete reference for all available API endpoints.

---

## Table of Contents

- [Chat Completions](#chat-completions)
- [Legacy Chat](#legacy-chat)
- [Workflow Builder](#workflow-builder)
- [Models](#models)
- [Sessions & Memory](#sessions--memory)
- [Health Check](#health-check)

---

## Chat Completions

### POST `/v1/chat/completions`

OpenAI-compatible chat completions endpoint. This is the primary endpoint for all interactions.

#### Request

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Generate a sunset over mountains"}
    ],
    "stream": true
  }'
```

#### Request Schema

```typescript
interface ChatCompletionRequest {
  // Required - OpenAI compatible
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;

  // OpenAI compatible options
  model?: string;              // Default: "eachsense/beta"
  stream?: boolean;            // Default: true
  max_tokens?: number;         // Ignored (auto-managed)
  temperature?: number;        // Ignored (auto-managed)

  // Eachlabs extensions
  session_id?: string;         // Conversation continuity
  mode?: "max" | "eco";        // Quality mode (default: "max")
  behavior?: "agent" | "plan" | "ask";  // Behavior mode (default: "agent")
  image_urls?: string[];       // Image inputs (max 4)
  workflow_id?: string;        // For workflow operations
  version_id?: string;         // Workflow version
  web_search?: boolean;        // Enable web search (default: true)
  enable_safety_checker?: boolean;  // NSFW filter (default: true)
}
```

#### Response (Streaming)

```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","model":"eachsense/beta","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}],"eachlabs":{"type":"thinking_delta","content":"Analyzing..."}}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","model":"eachsense/beta","choices":[{"index":0,"delta":{"content":"I'll generate..."},"finish_reason":null}],"eachlabs":{"type":"text_response","content":"I'll generate..."}}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","model":"eachsense/beta","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"eachlabs":{"type":"generation_response","url":"https://...","model":"nano-banana-pro"}}

data: [DONE]
```

#### Response (Non-Streaming)

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1708345678,
  "model": "eachsense/beta",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Here's your generated image of a sunset over mountains!"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 25,
    "total_tokens": 40
  },
  "generations": ["https://storage.eachlabs.ai/xxx.png"],
  "task_id": "task_abc123",
  "session_id": "session_xyz"
}
```

#### Eachlabs Extended Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `generations` | `string[]` | URLs of generated media |
| `task_id` | `string` | Unique task identifier |
| `session_id` | `string` | Session ID for continuity |
| `workflow_id` | `string` | Created/used workflow ID |
| `eachlabs` | `object` | Event metadata in streaming |

---

## Legacy Chat

### POST `/chat`

Simplified chat endpoint (deprecated, use `/v1/chat/completions` instead).

#### Request

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "message": "Generate a portrait photo",
    "session_id": "my-session",
    "stream": true
  }'
```

#### Request Schema

```typescript
interface LegacyChatRequest {
  message: string;             // User message
  session_id?: string;         // Conversation ID
  stream?: boolean;            // Default: true
  mode?: "max" | "eco";
  behavior?: "agent" | "plan" | "ask";
  model?: string;
  image_urls?: string[];
  workflow_id?: string;
  version_id?: string;
  web_search?: boolean;
  enable_safety_checker?: boolean;
}
```

#### Response

Same as `/v1/chat/completions` but with simplified SSE format:

```
data: {"type": "thinking_delta", "content": "..."}

data: {"type": "generation_response", "url": "https://...", "model": "..."}

data: {"type": "complete", "status": "ok", "generations": [...]}

data: [DONE]
```

---

## Workflow Builder

### POST `/workflow`

Build or update multi-step AI workflows.

#### Request

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/workflow \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "message": "Create a workflow that generates an image then animates it",
    "workflow_id": "wf_existing",
    "version_id": "v1",
    "stream": true
  }'
```

#### Request Schema

```typescript
interface WorkflowRequest {
  message: string;             // Workflow description or modification
  workflow_id?: string;        // Existing workflow to update
  version_id?: string;         // Version to update
  stream?: boolean;
  session_id?: string;
}
```

#### Response (Streaming)

```
data: {"type": "workflow_fetched", "workflow_name": "my-workflow", "existing_steps": 3}

data: {"type": "status", "message": "Building workflow definition..."}

data: {"type": "workflow_built", "steps_count": 4, "definition": {...}}

data: {"type": "workflow_updated", "success": true, "workflow_id": "wf_abc", "version_id": "v2"}

data: {"type": "complete", "status": "ok", "workflow_id": "wf_abc"}

data: [DONE]
```

---

## Models

### GET `/v1/models`

List available models (OpenAI compatible).

#### Request

```bash
curl https://eachsense-agent.core.eachlabs.run/v1/models \
  -H "X-API-Key: YOUR_API_KEY"
```

#### Response

```json
{
  "object": "list",
  "data": [
    {
      "id": "eachsense/beta",
      "object": "model",
      "created": 1708345678,
      "owned_by": "eachlabs"
    }
  ]
}
```

---

## Sessions & Memory

### GET `/memory`

Retrieve conversation history for a session.

#### Request

```bash
curl "https://eachsense-agent.core.eachlabs.run/memory?session_id=my-session" \
  -H "X-API-Key: YOUR_API_KEY"
```

#### Response

```json
{
  "session_id": "my-session",
  "conversation_history": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "user_prompt": "Generate a portrait",
      "chatbot_response": "Here's your portrait!",
      "generated_media_urls": ["https://storage.eachlabs.ai/xxx.png"]
    },
    {
      "timestamp": "2024-01-15T10:31:00Z",
      "user_prompt": "Make it anime style",
      "chatbot_response": "Here's the anime version!",
      "generated_media_urls": ["https://storage.eachlabs.ai/yyy.png"]
    }
  ],
  "total_exchanges": 2,
  "generated_media_urls": [
    "https://storage.eachlabs.ai/xxx.png",
    "https://storage.eachlabs.ai/yyy.png"
  ]
}
```

### DELETE `/memory`

Clear conversation history for a session.

#### Request

```bash
curl -X DELETE "https://eachsense-agent.core.eachlabs.run/memory?session_id=my-session" \
  -H "X-API-Key: YOUR_API_KEY"
```

#### Response

```json
{
  "cleared": true,
  "session_id": "my-session"
}
```

### GET `/sessions`

List all sessions for the authenticated user.

#### Request

```bash
curl https://eachsense-agent.core.eachlabs.run/sessions \
  -H "X-API-Key: YOUR_API_KEY"
```

#### Response

```json
{
  "sessions": [
    "default",
    "my-session",
    "project-alpha",
    "video-generation-2024"
  ]
}
```

---

## Health Check

### GET `/health`

Check service health status.

#### Request

```bash
curl https://eachsense-agent.core.eachlabs.run/health
```

#### Response

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET `/healthz`

Kubernetes-style health check (no auth required).

```bash
curl https://eachsense-agent.core.eachlabs.run/healthz
# Returns: "ok"
```

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Bad Request - Invalid parameters |
| `401` | Unauthorized - Missing or invalid API key |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Endpoint or resource not found |
| `422` | Unprocessable Entity - Validation error |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |
| `503` | Service Unavailable |

---

## Common Headers

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `X-API-Key` | Yes* | Your Eachlabs API key |
| `Authorization` | Yes* | `Bearer YOUR_API_KEY` (alternative) |
| `X-Session-Id` | No | Session ID (alternative to body param) |

*One of `X-API-Key` or `Authorization` is required.

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Unique request identifier for debugging |
| `X-Task-Id` | Task identifier for tracking |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when rate limit resets |
