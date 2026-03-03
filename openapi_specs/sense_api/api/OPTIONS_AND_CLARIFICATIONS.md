# Options & Clarifications

Guide for handling interactive choices and clarification requests from the AI agent.

---

## Overview

The AI agent may request additional information before proceeding with certain tasks. This happens when:

1. **Ambiguous Request** - The request could be interpreted multiple ways
2. **Missing Information** - Required details are not provided
3. **Multiple Options** - Several valid approaches exist
4. **Safety Confirmation** - High-impact operations need confirmation

---

## Clarification Event

When the agent needs clarification, it emits a `clarification_needed` event:

```json
{
  "type": "clarification_needed",
  "question": "What style would you like for your portrait?",
  "options": [
    "Photorealistic - Natural, high-quality photo appearance",
    "Artistic - Painterly, stylized artistic look",
    "Anime - Japanese animation style",
    "Cinematic - Movie poster aesthetic with dramatic lighting"
  ],
  "context": "I can generate your portrait in several styles. Each produces very different results.",
  "requires_response": true
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `question` | `string` | The question being asked |
| `options` | `string[]` | Suggested options (may be empty) |
| `context` | `string` | Additional context explaining why clarification is needed |
| `requires_response` | `boolean` | Whether a response is required to continue |

---

## Common Clarification Scenarios

### 1. Style Selection

```json
{
  "type": "clarification_needed",
  "question": "What visual style do you prefer?",
  "options": [
    "Photorealistic",
    "Anime/Manga",
    "Oil Painting",
    "Watercolor",
    "3D Rendered",
    "Sketch/Line Art"
  ],
  "context": "Different styles require different models and produce very different results."
}
```

### 2. Aspect Ratio

```json
{
  "type": "clarification_needed",
  "question": "What aspect ratio should the image be?",
  "options": [
    "1:1 - Square (Instagram post)",
    "16:9 - Landscape (YouTube thumbnail)",
    "9:16 - Portrait (Instagram Story/Reel)",
    "4:3 - Standard photo",
    "21:9 - Ultrawide/Cinematic"
  ],
  "context": "The aspect ratio affects composition. Choose based on your intended use."
}
```

### 3. Video Duration

```json
{
  "type": "clarification_needed",
  "question": "How long should the video be?",
  "options": [
    "5 seconds - Quick clip",
    "10 seconds - Short video",
    "15-30 seconds - Social media post",
    "60+ seconds - Extended content"
  ],
  "context": "Longer videos take more time and cost more to generate."
}
```

### 4. Image Edit Type

```json
{
  "type": "clarification_needed",
  "question": "What type of edit would you like?",
  "options": [
    "Remove background",
    "Change background to something else",
    "Apply style transfer",
    "Upscale/enhance resolution",
    "Remove unwanted objects",
    "Add or modify elements"
  ],
  "context": "I can see you've uploaded an image. What would you like to do with it?"
}
```

### 5. Model Selection

```json
{
  "type": "clarification_needed",
  "question": "Which model would you prefer?",
  "options": [
    "Flux 2 Max - Highest quality, slower (30-60s)",
    "Nano Banana Pro - Great quality, fast (10-20s)",
    "Seedream 4.5 - Good quality, very fast (5-10s)"
  ],
  "context": "Multiple models can handle this request. They differ in quality, speed, and cost."
}
```

### 6. NSFW Confirmation

```json
{
  "type": "clarification_needed",
  "question": "This request may produce adult content. Please confirm you want to proceed.",
  "options": [
    "Yes, generate NSFW content (18+ only)",
    "No, keep it safe for work"
  ],
  "context": "NSFW generation requires explicit confirmation and is only available on certain models.",
  "requires_response": true
}
```

### 7. Workflow Input Required

```json
{
  "type": "clarification_needed",
  "question": "Please provide the required inputs for your workflow:",
  "options": [],
  "context": "Your workflow 'portrait-to-video' requires:\n- description: Description of the person\n- background: Scene background\n- duration: Video length in seconds",
  "requires_response": true,
  "input_schema": {
    "description": {"type": "string", "required": true},
    "background": {"type": "string", "required": true},
    "duration": {"type": "integer", "default": 5}
  }
}
```

---

## Responding to Clarifications

### Method 1: Natural Language (Recommended)

Simply respond with natural language in the same session:

```json
// Original request
{
  "message": "Generate a portrait",
  "session_id": "my-session"
}

// Agent asks for style
// {"type": "clarification_needed", "question": "What style?", "options": [...]}

// User responds naturally
{
  "message": "Make it anime style with vibrant colors",
  "session_id": "my-session"
}
```

### Method 2: Select Option

Reference the option directly:

```json
{
  "message": "Option 3: Anime",
  "session_id": "my-session"
}
```

### Method 3: Provide All Details

Give complete information to avoid follow-up questions:

```json
{
  "message": "Generate an anime-style portrait, 1:1 aspect ratio, with a cyberpunk background and neon lighting",
  "session_id": "my-session"
}
```

---

## Behavior Modes

### `agent` Mode (Default)

The agent makes reasonable assumptions when possible:

```
User: "Generate a sunset"
Agent: (assumes landscape, photorealistic, executes immediately)
Result: Generated image
```

### `ask` Mode

The agent always asks for clarification before executing:

```json
{
  "message": "Generate a sunset",
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

### `plan` Mode

The agent shows its plan before executing:

```json
{
  "message": "Create a video from this image",
  "behavior": "plan",
  "image_urls": ["https://example.com/photo.jpg"]
}
```

Response:
```json
{
  "type": "clarification_needed",
  "question": "Here's my plan. Should I proceed?",
  "options": [
    "Yes, execute this plan",
    "No, I want to modify it"
  ],
  "context": "Plan:\n1. Analyze image content\n2. Generate 5-second video using Kling 2.1\n3. Apply smooth motion\n\nEstimated time: 2-3 minutes\nEstimated cost: $0.50"
}
```

---

## UI Implementation

### React Example

```jsx
import { useState } from 'react';

function ClarificationDialog({ event, onRespond }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [customInput, setCustomInput] = useState('');

  const handleSubmit = () => {
    const response = selectedOption === 'custom'
      ? customInput
      : event.options[selectedOption];
    onRespond(response);
  };

  return (
    <div className="clarification-dialog">
      <h3>{event.question}</h3>

      {event.context && (
        <p className="context">{event.context}</p>
      )}

      <div className="options">
        {event.options.map((option, index) => (
          <button
            key={index}
            className={selectedOption === index ? 'selected' : ''}
            onClick={() => setSelectedOption(index)}
          >
            {option}
          </button>
        ))}

        <button
          className={selectedOption === 'custom' ? 'selected' : ''}
          onClick={() => setSelectedOption('custom')}
        >
          Other (type your own)
        </button>
      </div>

      {selectedOption === 'custom' && (
        <textarea
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Describe what you want..."
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={selectedOption === null || (selectedOption === 'custom' && !customInput)}
      >
        Continue
      </button>
    </div>
  );
}

// Usage in chat component
function ChatComponent() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [clarification, setClarification] = useState(null);

  const handleEvent = (event) => {
    if (event.type === 'clarification_needed') {
      setClarification(event);
    }
    // ... handle other events
  };

  const handleClarificationResponse = async (response) => {
    setClarification(null);
    await sendMessage(response, sessionId);
  };

  return (
    <div>
      {/* Chat messages */}

      {clarification && (
        <ClarificationDialog
          event={clarification}
          onRespond={handleClarificationResponse}
        />
      )}
    </div>
  );
}
```

### Mobile App Example (React Native)

```jsx
function ClarificationSheet({ event, onRespond, onDismiss }) {
  return (
    <BottomSheet>
      <Text style={styles.question}>{event.question}</Text>

      {event.context && (
        <Text style={styles.context}>{event.context}</Text>
      )}

      <ScrollView>
        {event.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionButton}
            onPress={() => onRespond(option)}
          >
            <Text>{option}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TextInput
        placeholder="Or type your own response..."
        onSubmitEditing={(e) => onRespond(e.nativeEvent.text)}
      />
    </BottomSheet>
  );
}
```

---

## Non-Streaming Clarifications

When `stream: false`, clarifications are returned as a response object:

```json
{
  "success": true,
  "clarification_needed": true,
  "question": "What style would you prefer?",
  "options": [
    "Photorealistic",
    "Artistic",
    "Anime"
  ],
  "context": "Please select a style for your portrait.",
  "session_id": "session_abc123"
}
```

Check for `clarification_needed: true` to detect this response type.

---

## Workflow Inputs

For workflow executions, the clarification may include an input schema:

```json
{
  "type": "clarification_needed",
  "question": "Please provide inputs for the workflow:",
  "input_schema": {
    "description": {
      "type": "string",
      "description": "Description of the subject",
      "required": true
    },
    "style": {
      "type": "string",
      "enum": ["realistic", "anime", "artistic"],
      "default": "realistic"
    },
    "duration": {
      "type": "integer",
      "description": "Video duration in seconds",
      "minimum": 3,
      "maximum": 30,
      "default": 5
    }
  }
}
```

### Responding with Structured Inputs

```json
{
  "message": "Here are my inputs: description='Professional woman in business attire', style='realistic', duration=10",
  "session_id": "my-session"
}
```

Or more naturally:
```json
{
  "message": "Make it a professional woman in business attire, realistic style, 10 seconds long",
  "session_id": "my-session"
}
```

---

## Best Practices

### 1. Always Preserve Session ID

```javascript
const sessionId = crypto.randomUUID();

// First request
await sendMessage("Generate a portrait", sessionId);

// Response to clarification (SAME session ID)
await sendMessage("Anime style", sessionId);
```

### 2. Display Context

Always show the `context` field - it explains why clarification is needed:

```jsx
{event.context && (
  <p className="clarification-context">{event.context}</p>
)}
```

### 3. Allow Custom Input

Always provide an "Other" option for users who want to specify something not in the list:

```jsx
<input
  type="text"
  placeholder="Or describe what you want..."
  onKeyPress={(e) => e.key === 'Enter' && handleCustomInput()}
/>
```

### 4. Handle Empty Options

Sometimes `options` is empty when free-form input is expected:

```jsx
{event.options.length > 0 ? (
  <OptionsList options={event.options} />
) : (
  <TextInput placeholder="Please provide the requested information..." />
)}
```

### 5. Provide Defaults in UI

If options have defaults, pre-select them:

```jsx
const defaultOption = event.options.find(o => o.includes('(default)'));
const [selected, setSelected] = useState(
  defaultOption ? event.options.indexOf(defaultOption) : null
);
```

---

## Timeout Behavior

If a clarification is not responded to within the session timeout (15 minutes of inactivity), the session state is preserved but the specific clarification context may be lost.

To resume:
1. Use the same `session_id`
2. Restate your original request or provide the missing information

```json
{
  "message": "I want to continue with my portrait - make it anime style",
  "session_id": "my-session"
}
```
