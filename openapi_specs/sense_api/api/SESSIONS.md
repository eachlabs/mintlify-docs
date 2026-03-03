# Sessions & Memory

Complete guide for managing conversations, sessions, and conversation memory.

---

## Overview

The Eachlabs AI Agent supports persistent conversation memory, allowing for:

- **Multi-turn conversations** - Reference previous messages and generations
- **Context awareness** - Agent remembers what you discussed
- **Generation history** - Access previously generated media
- **Cross-request continuity** - Resume conversations later

---

## Session Identification

### Session ID

Every conversation is identified by a `session_id`. If not provided, a default session is used.

```json
{
  "messages": [{"role": "user", "content": "Generate a portrait"}],
  "session_id": "my-project-session"
}
```

### Session Scoping

Sessions are scoped by **API key** + **session_id**:

```
[API Key Hash]:[Session ID]
```

This means:
- Different API keys cannot access each other's sessions
- Same session ID with different API keys = different sessions
- Sessions are completely isolated between users

---

## Creating Sessions

### Implicit Creation

Sessions are created automatically on first use:

```json
// First request
{
  "messages": [{"role": "user", "content": "Hello"}],
  "session_id": "new-session"
}

// Session "new-session" is now created
```

### Best Practices for Session IDs

```javascript
// Good - descriptive and unique
const sessionId = `project-${projectId}-${Date.now()}`;

// Good - user-specific
const sessionId = `user-${userId}-chat`;

// Good - random UUID
const sessionId = crypto.randomUUID();

// Bad - too generic (may collide)
const sessionId = "session1";
```

---

## Multi-Turn Conversations

### Example Flow

```javascript
const sessionId = "portrait-project";

// Turn 1: Initial request
await chat({
  messages: [{ role: "user", content: "Generate a professional headshot" }],
  session_id: sessionId
});
// Agent generates image

// Turn 2: Modification (agent has context)
await chat({
  messages: [{ role: "user", content: "Make it more formal" }],
  session_id: sessionId
});
// Agent knows about the previous generation

// Turn 3: Another modification
await chat({
  messages: [{ role: "user", content: "Now remove the background" }],
  session_id: sessionId
});
// Agent applies to the latest image
```

### Context Retention

The agent retains:
- Previous user messages
- Assistant responses
- Generated media URLs
- Tool call history
- User preferences (within session)

---

## Memory Storage

### Dual Backend Architecture

The agent uses two memory backends:

#### 1. In-Memory (Default)

- **Use case:** Development, low-traffic deployments
- **Capacity:** Last 5 exchanges per session, max 100 sessions
- **Persistence:** Lost on service restart
- **Eviction:** LRU (Least Recently Used)

#### 2. PostgreSQL (Production)

- **Use case:** Production, persistent memory
- **Capacity:** Unlimited
- **Persistence:** Survives restarts
- **Features:** Full message metadata, token counts, latencies

**Enable PostgreSQL memory:**
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
```

---

## Memory API

### Get Session Memory

Retrieve conversation history for a session.

```bash
curl "https://eachsense-agent.core.eachlabs.run/memory?session_id=my-session" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Response:**
```json
{
  "session_id": "my-session",
  "conversation_history": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "user_prompt": "Generate a cyberpunk cityscape",
      "chatbot_response": "Here's your cyberpunk cityscape! I used Flux 2 Max for the best quality.",
      "generated_media_urls": ["https://storage.eachlabs.ai/abc.png"],
      "model_used": "flux-2-max",
      "token_usage": {
        "prompt": 45,
        "completion": 35
      },
      "latency_ms": 15200
    },
    {
      "timestamp": "2024-01-15T10:32:00Z",
      "user_prompt": "Add more neon lights",
      "chatbot_response": "I've enhanced the scene with more neon lighting!",
      "generated_media_urls": ["https://storage.eachlabs.ai/def.png"],
      "model_used": "flux-2-edit",
      "token_usage": {
        "prompt": 65,
        "completion": 40
      },
      "latency_ms": 12800
    }
  ],
  "total_exchanges": 2,
  "generated_media_urls": [
    "https://storage.eachlabs.ai/abc.png",
    "https://storage.eachlabs.ai/def.png"
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:32:00Z"
}
```

### Clear Session Memory

Delete conversation history for a session.

```bash
curl -X DELETE "https://eachsense-agent.core.eachlabs.run/memory?session_id=my-session" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Response:**
```json
{
  "cleared": true,
  "session_id": "my-session",
  "messages_deleted": 5
}
```

### List All Sessions

Get all session IDs for your API key.

```bash
curl "https://eachsense-agent.core.eachlabs.run/sessions" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Response:**
```json
{
  "sessions": [
    {
      "session_id": "default",
      "message_count": 12,
      "last_activity": "2024-01-15T10:30:00Z"
    },
    {
      "session_id": "portrait-project",
      "message_count": 5,
      "last_activity": "2024-01-15T09:15:00Z"
    },
    {
      "session_id": "video-workflow",
      "message_count": 8,
      "last_activity": "2024-01-14T16:45:00Z"
    }
  ],
  "total_sessions": 3
}
```

---

## Session Lifecycle

### Session States

```
┌─────────────┐     First Request     ┌─────────────┐
│   (none)    │ ───────────────────▶ │   Active    │
└─────────────┘                       └─────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
            ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
            │  Inactive   │         │   Cleared   │         │   Expired   │
            │(15 min idle)│         │ (manually)  │         │(30 day TTL) │
            └─────────────┘         └─────────────┘         └─────────────┘
                    │
                    ▼
              New Request
                    │
                    ▼
            ┌─────────────┐
            │   Active    │
            └─────────────┘
```

### Timeouts

| Event | Timeout |
|-------|---------|
| Idle timeout | 15 minutes |
| Session TTL (PostgreSQL) | 30 days |
| In-memory eviction | LRU after 100 sessions |

### Reactivating Inactive Sessions

Inactive sessions can be reactivated with any new request:

```json
{
  "messages": [{"role": "user", "content": "Continue where we left off"}],
  "session_id": "old-session"
}
```

The agent will have full context from previous messages.

---

## Message History Format

### Database Schema

When PostgreSQL is enabled, messages are stored with full metadata:

```sql
CREATE TABLE eachsense_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES eachsense_sessions,
  role VARCHAR(20),          -- 'user' or 'assistant'
  content TEXT,              -- Message text
  created_at TIMESTAMP,
  model VARCHAR(100),        -- Model used
  media_urls JSONB,          -- Generated URLs
  tool_calls JSONB,          -- Tools invoked
  token_usage JSONB,         -- {prompt, completion}
  latency_ms INTEGER,        -- Response time
  error TEXT,                -- Error if any
  metadata JSONB             -- Additional data
);
```

### Memory Context Injection

When processing a request, the agent receives context from memory:

```json
{
  "system": "You are each::sense AI agent...",
  "memory_context": {
    "session_id": "my-session",
    "previous_messages": [
      {"role": "user", "content": "Generate a portrait"},
      {"role": "assistant", "content": "Here's your portrait!", "media": ["https://..."]}
    ],
    "generated_media": ["https://storage.eachlabs.ai/portrait.png"],
    "user_preferences": {
      "preferred_style": "photorealistic",
      "default_aspect_ratio": "1:1"
    }
  },
  "user_message": "Now make it anime style"
}
```

---

## Advanced Usage

### Session Namespacing

Organize sessions by project or feature:

```javascript
// By project
const sessionId = `project:${projectId}:main`;

// By feature
const sessionId = `user:${userId}:portrait-generator`;

// By date
const sessionId = `batch:${date}:${batchId}`;
```

### Session Forking

Create a new session based on an existing one:

```javascript
// Get existing session memory
const memory = await getMemory("original-session");

// Create new session with context
await chat({
  messages: [
    // Include relevant history
    ...memory.conversation_history.slice(-3).map(h => [
      { role: "user", content: h.user_prompt },
      { role: "assistant", content: h.chatbot_response }
    ]).flat(),
    // New request
    { role: "user", content: "Now try a different approach" }
  ],
  session_id: "forked-session"
});
```

### Bulk Session Operations

```javascript
// Clear all sessions for a project
const sessions = await listSessions();
const projectSessions = sessions.filter(s => s.session_id.startsWith("project:123:"));

for (const session of projectSessions) {
  await clearMemory(session.session_id);
}
```

---

## Best Practices

### 1. Use Meaningful Session IDs

```javascript
// Good
const sessionId = `user-${userId}-portrait-editor`;

// Bad
const sessionId = "abc123";
```

### 2. Clear Sessions When Done

```javascript
// Clean up after project completion
await clearMemory(sessionId);
```

### 3. Handle Session Expiry Gracefully

```javascript
try {
  const response = await chat({ message, session_id: sessionId });
} catch (error) {
  if (error.code === 'SESSION_NOT_FOUND') {
    // Session expired, start fresh
    const newSessionId = generateNewSessionId();
    return await chat({ message, session_id: newSessionId });
  }
  throw error;
}
```

### 4. Don't Store Sensitive Data in Session

Sessions store conversation content. Avoid including:
- Passwords or API keys
- Personal identification numbers
- Credit card information

### 5. Monitor Session Usage

```javascript
async function checkSessionHealth(sessionId) {
  const memory = await getMemory(sessionId);

  if (memory.total_exchanges > 40) {
    console.warn(`Session ${sessionId} approaching limit`);
  }

  const lastActivity = new Date(memory.updated_at);
  const inactiveMinutes = (Date.now() - lastActivity) / 60000;

  if (inactiveMinutes > 10) {
    console.warn(`Session ${sessionId} may expire soon`);
  }
}
```

---

## Session Isolation Security

### API Key Isolation

Sessions are cryptographically bound to API keys:

```
Session Key = SHA256(api_key)[:16] + ":" + session_id
```

This ensures:
- No cross-user session access
- Session IDs can be shared without security risk
- API key rotation invalidates old sessions

### Session Hijacking Prevention

- Session IDs alone don't grant access
- Both API key and session ID required
- Sessions expire after inactivity
- No session enumeration possible

### Audit Logging (Enterprise)

```json
{
  "event": "session.accessed",
  "session_id": "my-session",
  "api_key_hash": "abc123...",
  "user_id": "user_456",
  "ip_address": "1.2.3.4",
  "timestamp": "2024-01-15T10:30:00Z"
}
```
