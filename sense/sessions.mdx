---
title: "Sessions"
description: "Persistent conversation memory for multi-turn interactions."
---

## Overview

Sessions enable multi-turn conversations with context retention. The agent remembers previous messages, generated media, and user preferences.

## Using Sessions

Include `session_id` in your requests:

```json
{
  "messages": [{"role": "user", "content": "Generate a portrait"}],
  "session_id": "my-project-session"
}
```

Sessions are created automatically on first use.

## Session Scoping

Sessions are scoped by **API key + session_id**:

- Different API keys cannot access each other's sessions
- Same session ID with different keys = different sessions

## Multi-Turn Example

```python
SESSION_ID = "portrait-project"

# Turn 1: Generate an image
await chat("Generate a professional headshot", session_id=SESSION_ID)

# Turn 2: Agent remembers the image and modifies it
await chat("Make it more formal", session_id=SESSION_ID)

# Turn 3: Agent applies to the latest image
await chat("Now remove the background", session_id=SESSION_ID)
```

## Context Retention

The agent retains within a session:

- Previous user messages and responses
- Generated media URLs
- Tool call history
- User preferences

## Session Lifecycle

| Event | Timeout |
|-------|---------|
| Idle timeout | 15 minutes |
| Session TTL | 30 days |
| Memory limit | 50 messages per session |

Inactive sessions can be reactivated with any new request using the same `session_id`.

## Best Practices

**Use meaningful IDs:**
```javascript
const sessionId = `user-${userId}-portrait-editor`;
```

**Clear sessions when done:**
```bash
curl -X DELETE "https://eachsense-agent.core.eachlabs.run/memory?session_id=my-session" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Handle session expiry:**
```javascript
try {
  await chat({ message, session_id: sessionId });
} catch (error) {
  if (error.code === "SESSION_NOT_FOUND") {
    // Session expired, start fresh
    sessionId = crypto.randomUUID();
    await chat({ message, session_id: sessionId });
  }
}
```
