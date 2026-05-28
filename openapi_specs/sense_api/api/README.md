# Eachlabs AI Agent v2 - OpenAI Compatible API

> **each::sense** - The intelligent layer for generative media.

This documentation covers the OpenAI-compatible API for the Eachlabs AI Agent, which provides a unified interface for generating images, videos, audio, and managing AI workflows.

## Quick Links

| Document | Description |
|----------|-------------|
| [Endpoints](./ENDPOINTS.md) | All API endpoints with request/response schemas |
| [Response Types](./RESPONSE_TYPES.md) | 18 streaming event types + non-streaming formats |
| [Streaming Guide](./STREAMING.md) | SSE streaming implementation details |
| [Options & Clarifications](./OPTIONS_AND_CLARIFICATIONS.md) | Interactive choice/option handling |
| [Workflows](./WORKFLOWS.md) | Multi-step workflow creation and execution |
| [Edge Cases](./EDGE_CASES.md) | Error handling, timeouts, NSFW, limits |
| [Sessions](./SESSIONS.md) | Conversation memory and session management |
| [Tools](./TOOLS.md) | 11 available tools and function calling patterns |
| [Examples](./EXAMPLES.md) | Complete code examples in multiple languages |

---

## Base URL

```
https://eachsense-agent.core.eachlabs.run
```

## Authentication

The API supports two authentication methods:

```bash
# Method 1: X-API-Key header (recommended)
curl -H "X-API-Key: YOUR_EACHLABS_API_KEY" ...

# Method 2: Bearer token (OpenAI SDK compatible)
curl -H "Authorization: Bearer YOUR_EACHLABS_API_KEY" ...
```

Get your API key at: https://eachlabs.ai/settings/api-keys

---

## Quick Start

### Simple Generation

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Generate a cyberpunk cityscape at night"}],
    "stream": false
  }'
```

### Streaming Response

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Create a 5 second video of a cat"}],
    "stream": true
  }'
```

### Python SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_EACHLABS_API_KEY",
    base_url="https://eachsense-agent.core.eachlabs.run/v1"
)

response = client.chat.completions.create(
    model="eachsense/beta",
    messages=[{"role": "user", "content": "Generate a portrait photo"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

---

## Core Concepts

### 1. Intelligent Model Selection

The agent automatically selects the best AI model for your task from 500+ available models:

```
"Generate a video from this image" → kling-2-1-image-to-video
"Remove the background"           → eachlabs-bg-remover-v1
"Create anime-style portrait"     → wan-v2-6-text-to-image
```

### 2. Multi-Modal Support

| Input Types | Output Types |
|-------------|--------------|
| Text prompts | Images |
| Images (up to 4) | Videos |
| Audio files | Audio/Music |
| Video URLs | 3D Models |
| Mixed inputs | Text |

### 3. Behavior Modes

| Mode | Description |
|------|-------------|
| `agent` (default) | Automatically executes the best approach |
| `plan` | Returns a plan for approval before executing |
| `ask` | Always asks for clarification first |

### 4. Quality Modes

| Mode | Description | Speed |
|------|-------------|-------|
| `max` (default) | Premium models, best quality | 10-300s |
| `eco` | Fast/cheap models, good for prototyping | 5-180s |

---

## Request Schema

```typescript
interface ChatRequest {
  // Required
  messages: Array<{role: "user" | "assistant", content: string}>;

  // Optional
  stream?: boolean;           // Default: true
  session_id?: string;        // For conversation continuity
  mode?: "max" | "eco";       // Quality mode
  behavior?: "agent" | "plan" | "ask";  // Behavior mode
  model?: string;             // Specific model or "auto"
  image_urls?: string[];      // Up to 4 images
  workflow_id?: string;       // For workflow operations
  version_id?: string;        // Workflow version
  web_search?: boolean;       // Enable web search (default: true)
  enable_safety_checker?: boolean;  // NSFW filter (default: true)
}
```

---

## Response Format

### Streaming (SSE)

```
data: {"type": "thinking_delta", "content": "Analyzing request..."}

data: {"type": "status", "message": "Searching models...", "tool_name": "search_models"}

data: {"type": "generation_response", "url": "https://...", "model": "nano-banana-pro"}

data: {"type": "complete", "status": "ok", "generations": ["https://..."]}

data: [DONE]
```

### Non-Streaming (JSON)

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "model": "eachsense/beta",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Here's your generated image!"
    },
    "finish_reason": "stop"
  }],
  "generations": ["https://storage.eachlabs.ai/xxx.png"],
  "task_id": "task_abc123"
}
```

---

## Supported Models (Curated List)

### Image Generation
- `flux-2-max`, `flux-2-pro`, `flux-kontext-pro`
- `nano-banana-pro`, `gemini-imagen-4`
- `seedream-v4-5-text-to-image`
- `kling-text-to-image`

### Video Generation
- `veo-3`, `veo3-1-text-to-video-fast`
- `kling-3-0`, `kling-2-1-image-to-video`
- `wan-v2-6-image-to-video`, `wan-v2-6-text-to-video`
- `pixverse-v4-1-text-to-video`
- `sora-2-pro`

### Image Editing
- `flux-2-edit`, `flux-fill-pro`
- `eachlabs-bg-remover-v1`
- `topaz-upscale-image`
- `kling-face-swap`

### Audio/Music
- `elevenlabs-text-to-speech`
- `mureka-generate-music`
- `stable-audio-2-5-text-to-audio`

See [full model list](./MODELS.md) for 500+ available models.

---

## Rate Limits & Quotas

| Plan | Requests/min | Concurrent | Balance |
|------|--------------|------------|---------|
| Free | 10 | 2 | $5 credit |
| Pro | 60 | 10 | Pay-as-you-go |
| Enterprise | Unlimited | 50 | Custom |

---

## Error Handling

```json
{
  "type": "error",
  "message": "Insufficient balance. Please top up at https://eachlabs.ai/billing"
}
```

See [Edge Cases](./EDGE_CASES.md) for complete error handling guide.

---

## Support

- Documentation: https://docs.eachlabs.ai
- API Status: https://status.eachlabs.ai
- Discord: https://discord.gg/eachlabs
- Email: support@eachlabs.ai
