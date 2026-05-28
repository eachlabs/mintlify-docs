---
title: "Streaming Overview"
description: "Real-time Server-Sent Events (SSE) streaming for each::sense responses."
---

## Overview

each::sense uses Server-Sent Events (SSE) for real-time streaming. This enables progressive AI reasoning display, live generation updates, and workflow execution monitoring.

## SSE Format

Each event follows the SSE specification:

```
data: {"type": "event_type", "field": "value"}\n\n
```

The stream terminates with:

```
data: [DONE]\n\n
```

## Enabling Streaming

Set `stream: true` in your request (this is the default):

```bash
curl -N -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Generate a portrait"}],
    "stream": true
  }'
```

## Event Categories

| Category | Event Types | Purpose |
|----------|-------------|---------|
| AI Reasoning | `thinking_delta`, `text_response` | Display AI thought process |
| Tool Operations | `status`, `tool_call`, `message`, `progress` | Show operation progress |
| Generation | `generation_response` | Deliver generated media |
| Interaction | `clarification_needed` | Request user input |
| Web Search | `web_search_query`, `web_search_citations` | Search status and results |
| Workflow | `workflow_created`, `workflow_fetched`, `workflow_built`, `workflow_updated` | Workflow lifecycle |
| Execution | `execution_started`, `execution_progress`, `execution_completed` | Workflow execution |
| Terminal | `complete`, `error` | Task completion or failure |

## Event Flow: Simple Generation

```
thinking_delta     → "Analyzing request..."
status             → "Searching for best model..."
status             → "Executing nano-banana-pro..."
text_response      → "Here's your portrait!"
generation_response → url: "https://..."
complete           → status: "ok"
[DONE]
```

## OpenAI-Compatible Format

When using `/v1/chat/completions`, events are wrapped in OpenAI-compatible chunks with each::labs extensions in the `eachlabs` field:

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion.chunk",
  "model": "eachsense/beta",
  "choices": [{
    "index": 0,
    "delta": {"content": "Generating your image..."},
    "finish_reason": null
  }],
  "eachlabs": {
    "type": "text_response",
    "content": "Generating your image..."
  }
}
```

## Timeouts

| Operation | Timeout |
|-----------|---------|
| HTTP request | 300 seconds |
| Streaming connection | 15 minutes idle |
| Image generation | 10–60 seconds |
| Video generation | 60–600 seconds |
| Workflow execution | 15 minutes |
