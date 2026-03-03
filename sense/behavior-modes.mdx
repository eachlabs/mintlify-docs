---
title: "Behavior Modes"
description: "Control how the agent handles your requests with agent, plan, and ask modes."
---

## Overview

The `behavior` parameter controls how the agent processes requests:

| Mode | Description | When to Use |
|------|-------------|-------------|
| `agent` (default) | Automatically executes the best approach | Production use, straightforward requests |
| `plan` | Shows a plan before executing | Complex tasks, cost-sensitive operations |
| `ask` | Always asks for clarification first | When you want full control |

## Agent Mode (Default)

The agent makes reasonable assumptions and executes immediately:

```json
{
  "messages": [{"role": "user", "content": "Generate a sunset"}],
  "behavior": "agent"
}
```

The agent selects the best model, chooses parameters, and generates without asking.

## Plan Mode

The agent shows its plan and waits for approval:

```json
{
  "messages": [{
    "role": "user",
    "content": "Create a video from this image"
  }],
  "behavior": "plan",
  "image_urls": ["https://example.com/photo.jpg"]
}
```

Response:

```json
{
  "type": "clarification_needed",
  "question": "Here's my plan. Should I proceed?",
  "options": ["Yes, execute this plan", "No, I want to modify it"],
  "context": "Plan:\n1. Analyze image content\n2. Generate 5-second video using Kling 2.1\n3. Apply smooth motion\n\nEstimated time: 2-3 minutes\nEstimated cost: $0.50"
}
```

Approve or modify the plan in the same session:

```json
{
  "messages": [{"role": "user", "content": "Yes, go ahead"}],
  "session_id": "same-session-id"
}
```

## Ask Mode

The agent always asks for clarification before executing:

```json
{
  "messages": [{"role": "user", "content": "Generate a sunset"}],
  "behavior": "ask"
}
```

Response:

```json
{
  "type": "clarification_needed",
  "question": "I'd like to generate a sunset image. Could you provide more details?",
  "options": [
    "Photorealistic landscape",
    "Artistic/painterly style",
    "Anime/illustration style",
    "Let me describe exactly what I want"
  ]
}
```

## Quality Modes

The `mode` parameter controls model quality selection:

| Mode | Description | Speed | Cost |
|------|-------------|-------|------|
| `max` (default) | Premium models, best quality | 10–300s | Higher |
| `eco` | Fast/cheap models, good for prototyping | 5–180s | Lower |

```json
{
  "messages": [{"role": "user", "content": "Generate a portrait"}],
  "mode": "eco"
}
```
