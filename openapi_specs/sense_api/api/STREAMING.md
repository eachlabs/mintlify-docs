# Streaming Guide

Complete guide to implementing SSE streaming with the Eachlabs AI Agent API.

---

## Overview

The API uses **Server-Sent Events (SSE)** for real-time streaming responses. This enables:

- Real-time AI reasoning display
- Progressive generation updates
- Live workflow execution monitoring
- Immediate error feedback

---

## SSE Format

Each event follows the SSE specification:

```
data: {"type": "event_type", "field": "value"}\n\n
```

The stream terminates with:
```
data: [DONE]\n\n
```

---

## Implementation Examples

### JavaScript (Browser)

```javascript
async function streamChat(message, sessionId) {
  const response = await fetch('https://eachsense-agent.core.eachlabs.run/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      session_id: sessionId,
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);

        if (data === '[DONE]') {
          console.log('Stream completed');
          return;
        }

        try {
          const event = JSON.parse(data);
          handleEvent(event);
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    }
  }
}

function handleEvent(event) {
  switch (event.type) {
    case 'thinking_delta':
      // Display AI reasoning
      appendToThinkingPanel(event.content);
      break;

    case 'text_response':
      // Display assistant message
      appendToChatMessage(event.content);
      break;

    case 'status':
      // Show loading indicator with context
      updateStatusBar(event.message, event.tool_name);
      break;

    case 'generation_response':
      // Display generated media
      displayMedia(event.url, event.model);
      break;

    case 'clarification_needed':
      // Show options to user
      showOptionsDialog(event.question, event.options);
      break;

    case 'execution_progress':
      // Update progress bar
      updateProgress(event.completed_steps, event.total_steps);
      break;

    case 'error':
      // Show error message
      showError(event.message);
      break;

    case 'complete':
      // Finalize UI
      hideLoadingIndicator();
      break;
  }
}
```

### JavaScript (Node.js with EventSource)

```javascript
import EventSource from 'eventsource';

function streamWithEventSource(message) {
  // Note: EventSource doesn't support POST, so use fetch-event-source
  const es = new EventSource(
    'https://eachsense-agent.core.eachlabs.run/chat?' +
    new URLSearchParams({ message, stream: 'true' }),
    {
      headers: {
        'X-API-Key': 'YOUR_API_KEY'
      }
    }
  );

  es.onmessage = (e) => {
    if (e.data === '[DONE]') {
      es.close();
      return;
    }
    const event = JSON.parse(e.data);
    console.log(event.type, event);
  };

  es.onerror = (e) => {
    console.error('SSE Error:', e);
    es.close();
  };
}
```

### Python (requests)

```python
import requests
import json

def stream_chat(message: str, session_id: str = None):
    response = requests.post(
        'https://eachsense-agent.core.eachlabs.run/v1/chat/completions',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': 'YOUR_API_KEY'
        },
        json={
            'messages': [{'role': 'user', 'content': message}],
            'session_id': session_id,
            'stream': True
        },
        stream=True
    )

    for line in response.iter_lines():
        if not line:
            continue

        line = line.decode('utf-8')
        if not line.startswith('data: '):
            continue

        data = line[6:]  # Remove 'data: ' prefix

        if data == '[DONE]':
            print('\nStream completed')
            break

        try:
            event = json.loads(data)
            handle_event(event)
        except json.JSONDecodeError as e:
            print(f'Parse error: {e}')


def handle_event(event: dict):
    event_type = event.get('type')

    if event_type == 'thinking_delta':
        print(f"🧠 {event['content']}", end='', flush=True)

    elif event_type == 'text_response':
        print(f"\n💬 {event['content']}")

    elif event_type == 'status':
        print(f"⏳ {event['message']}")

    elif event_type == 'generation_response':
        print(f"\n🎨 Generated: {event['url']}")
        print(f"   Model: {event.get('model', 'unknown')}")

    elif event_type == 'clarification_needed':
        print(f"\n❓ {event['question']}")
        if event.get('options'):
            for i, opt in enumerate(event['options'], 1):
                print(f"   {i}. {opt}")

    elif event_type == 'execution_progress':
        progress = event.get('progress_percent', 0)
        print(f"📊 Progress: {progress}% ({event['step_id']})")

    elif event_type == 'error':
        print(f"\n❌ Error: {event['message']}")

    elif event_type == 'complete':
        print(f"\n✅ Complete (Task: {event.get('task_id')})")


# Usage
stream_chat("Generate a cyberpunk cityscape", "my-session")
```

### Python (aiohttp - Async)

```python
import aiohttp
import asyncio
import json

async def stream_chat_async(message: str, session_id: str = None):
    async with aiohttp.ClientSession() as session:
        async with session.post(
            'https://eachsense-agent.core.eachlabs.run/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'X-API-Key': 'YOUR_API_KEY'
            },
            json={
                'messages': [{'role': 'user', 'content': message}],
                'session_id': session_id,
                'stream': True
            }
        ) as response:
            async for line in response.content:
                line = line.decode('utf-8').strip()

                if not line.startswith('data: '):
                    continue

                data = line[6:]

                if data == '[DONE]':
                    break

                try:
                    event = json.loads(data)
                    await handle_event_async(event)
                except json.JSONDecodeError:
                    pass


async def handle_event_async(event: dict):
    event_type = event.get('type')

    if event_type == 'generation_response':
        print(f"Generated: {event['url']}")
    elif event_type == 'error':
        print(f"Error: {event['message']}")
    # ... handle other events


# Usage
asyncio.run(stream_chat_async("Create a portrait"))
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_EACHLABS_API_KEY",
    base_url="https://eachsense-agent.core.eachlabs.run/v1"
)

def stream_with_openai_sdk(message: str):
    stream = client.chat.completions.create(
        model="eachsense/beta",
        messages=[{"role": "user", "content": message}],
        stream=True
    )

    generations = []

    for chunk in stream:
        # Standard OpenAI delta content
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end='', flush=True)

        # Eachlabs extended events (in raw response)
        # Access via: chunk.model_extra.get('eachlabs')
        if hasattr(chunk, 'model_extra') and chunk.model_extra:
            eachlabs = chunk.model_extra.get('eachlabs', {})
            if eachlabs.get('type') == 'generation_response':
                generations.append(eachlabs.get('url'))

        # Check for generations in final chunk
        if hasattr(chunk, 'generations'):
            generations.extend(chunk.generations)

    print(f"\n\nGenerations: {generations}")
    return generations


# Usage
stream_with_openai_sdk("Generate a sunset photo")
```

### cURL

```bash
curl -N -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Generate a portrait"}],
    "stream": true
  }'
```

Output:
```
data: {"type":"thinking_delta","content":"Analyzing the request..."}

data: {"type":"status","message":"Searching for best model...","tool_name":"search_models"}

data: {"type":"text_response","content":"I'll generate a portrait using nano-banana-pro."}

data: {"type":"generation_response","url":"https://storage.eachlabs.ai/xxx.png","model":"nano-banana-pro"}

data: {"type":"complete","status":"ok","generations":["https://storage.eachlabs.ai/xxx.png"]}

data: [DONE]
```

---

## Event Flow Patterns

### Simple Generation

```
User: "Generate a sunset"
         │
         ▼
┌────────────────────┐
│ thinking_delta     │  "Let me find the best model..."
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ status             │  "Searching models..."
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ status             │  "Executing nano-banana-pro..."
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ text_response      │  "Here's your sunset!"
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ generation_response│  url: "https://..."
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ complete           │  status: "ok"
└────────────────────┘
         │
         ▼
      [DONE]
```

### With Clarification

```
User: "Edit my photo"
         │
         ▼
┌────────────────────┐
│ thinking_delta     │  "The user wants to edit..."
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ clarification_     │  question: "What type of edit?"
│ needed             │  options: ["Background", "Style", ...]
└────────────────────┘
         │
         ▼
      [DONE]

User: "Remove background" (same session_id)
         │
         ▼
┌────────────────────┐
│ status             │  "Removing background..."
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ generation_response│  url: "https://..."
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ complete           │  status: "ok"
└────────────────────┘
         │
         ▼
      [DONE]
```

### Workflow Execution

```
User: "Run my video workflow"
         │
         ▼
┌────────────────────┐
│ execution_started  │  execution_id: "exec_123"
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ execution_progress │  step: 1/4, model: "flux-2-max"
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ execution_progress │  step: 2/4, model: "kling-2-1"
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ execution_progress │  step: 3/4, model: "topaz-upscale"
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ execution_progress │  step: 4/4, model: "auto-subtitle"
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ execution_completed│  all_outputs: {...}
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ complete           │  status: "ok"
└────────────────────┘
         │
         ▼
      [DONE]
```

---

## Error Handling

### Connection Errors

```javascript
async function streamWithRetry(message, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await streamChat(message);
      return; // Success
    } catch (error) {
      retries++;

      if (error.name === 'AbortError') {
        // Request was cancelled
        return;
      }

      if (retries < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### Timeout Handling

```javascript
async function streamWithTimeout(message, timeoutMs = 300000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {...},
      body: JSON.stringify({...}),
      signal: controller.signal
    });

    // Process stream...
  } finally {
    clearTimeout(timeout);
  }
}
```

### Partial Event Handling

```javascript
// Handle incomplete events at stream end
function processBuffer(buffer) {
  if (buffer.trim()) {
    console.warn('Incomplete event in buffer:', buffer);
    // Attempt to parse or discard
  }
}
```

---

## Best Practices

### 1. Always Handle `[DONE]`

```javascript
if (data === '[DONE]') {
  cleanup();
  return;
}
```

### 2. Buffer Partial Lines

SSE data may arrive in chunks. Always buffer:

```javascript
let buffer = '';
buffer += decoder.decode(value, { stream: true });
const lines = buffer.split('\n');
buffer = lines.pop() || ''; // Keep incomplete line
```

### 3. Handle All Event Types

Even if you don't display them, acknowledge all events:

```javascript
switch (event.type) {
  case 'thinking_delta': break; // Optional display
  case 'status': showStatus(event); break;
  case 'generation_response': showMedia(event); break;
  case 'error': showError(event); break;
  case 'complete': finalize(event); break;
  default:
    console.log('Unknown event:', event.type);
}
```

### 4. Preserve Session ID

For multi-turn conversations, always include the session ID:

```javascript
const sessionId = response.session_id || crypto.randomUUID();
// Use this sessionId for all subsequent requests
```

### 5. Handle Reconnection

If the stream drops unexpectedly:

```javascript
let lastEventId = null;

function handleEvent(event) {
  lastEventId = event.task_id || lastEventId;
  // ... process event
}

// On reconnection, you can query task status
async function checkTaskStatus(taskId) {
  const response = await fetch(`/tasks/${taskId}`);
  return response.json();
}
```

---

## Timeouts Reference

| Operation | Timeout |
|-----------|---------|
| HTTP request | 300 seconds |
| Streaming connection | 15 minutes idle |
| Image generation | 10-60 seconds |
| Video generation | 60-600 seconds |
| Workflow execution | 15 minutes |

---

## Debugging

### Enable Verbose Logging

```javascript
function handleEvent(event) {
  if (process.env.DEBUG) {
    console.log('[SSE]', JSON.stringify(event, null, 2));
  }
  // ... handle event
}
```

### Inspect Raw Stream

```bash
curl -N -X POST https://eachsense-agent.core.eachlabs.run/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"message": "test", "stream": true}' \
  | tee /dev/stderr | cat
```
