# Voice Flow API Contract

## Overview
This document defines the API contract between the Node.js/Bun backend and the Python microservice for the Voice Flow Demo.

**Architecture**: 
- **Node.js/Bun**: Orchestrates UI, maintains session state, routes voice requests to Python
- **Python Microservice**: Handles STT, TTS, RAG, and intent extraction

**Audio Format**: Base64-encoded WAV (batch mode, no streaming)

---

## Endpoints

### 1. POST /stt (Speech-to-Text)

Converts audio to text using Zipformer-30M-RNNT-6000h.

**Request**:
```json
{
  "session_id": "string",
  "audio_base64": "string",
  "language": "vi" | "en"
}
```

**Response**:
```json
{
  "session_id": "string",
  "text": "string",
  "confidence": 0.0-1.0,
  "language": "vi" | "en",
  "error": "string?" 
}
```

**Fields**:
- `session_id`: Unique session identifier for context tracking
- `audio_base64`: Base64-encoded WAV audio data
- `language`: Target language (Vietnamese default)
- `text`: Transcribed text
- `confidence`: Transcription confidence score
- `error`: Error message if transcription fails

---

### 2. POST /tts (Text-to-Speech)

Converts text to audio using piper-tts.

**Request**:
```json
{
  "session_id": "string",
  "text": "string",
  "language": "vi" | "en"
}
```

**Response**:
```json
{
  "session_id": "string",
  "audio_base64": "string",
  "duration_ms": 0,
  "error": "string?"
}
```

**Fields**:
- `session_id`: Unique session identifier
- `text`: Text to synthesize
- `language`: Target language
- `audio_base64`: Base64-encoded WAV audio response
- `duration_ms`: Audio duration in milliseconds
- `error`: Error message if synthesis fails

---

### 3. POST /voice-process (Voice Flow Processing)

Main endpoint that handles the full voice flow: STT → Intent → RAG → LLM → TTS.

**Request**:
```json
{
  "session_id": "string",
  "audio_base64": "string?",
  "text": "string?",
  "language": "vi" | "en",
  "context": {
    "last_intent": "string?",
    "last_slots": "object?",
    "cart_items": "array?",
    "conversation_history": "array?"
  }
}
```

**Response**:
```json
{
  "session_id": "string",
  "transcribed_text": "string?",
  "intent": "string",
  "slots": {
    "product_name": "string?",
    "brand": "string?",
    "price_min": "number?",
    "price_max": "number?",
    "quantity": "number?",
    "order_id": "string?"
  },
  "action": {
    "type": "add_to_cart" | "remove_from_cart" | "navigate" | "checkout" | "search" | "compare" | "faq" | "order_status" | "create_ticket",
    "payload": "object?"
  },
  "response_text": "string",
  "response_audio_base64": "string",
  "rag_context": {
    "sources": "array?",
    "confidence": "number?"
  },
  "error": "string?"
}
```

**Fields**:

**Request**:
- `session_id`: Unique session identifier
- `audio_base64`: Base64-encoded audio (optional if text provided)
- `text`: Text input (optional if audio provided, fallback mode)
- `language`: Target language
- `context`: Session context for context-aware responses
  - `last_intent`: Previous intent for follow-up handling
  - `last_slots`: Previous extracted slots
  - `cart_items`: Current cart state (for reference in responses)
  - `conversation_history`: Recent conversation turns

**Response**:
- `session_id`: Session identifier
- `transcribed_text`: STT output (if audio was provided)
- `intent`: Classified intent (see Intent Types below)
- `slots`: Extracted entities from user input
- `action`: Suggested action for the frontend to execute
  - `type`: Action type matching intent
  - `payload`: Additional data needed to execute action (e.g., product_id, search_query)
- `response_text`: LLM-generated response text
- `response_audio_base64`: TTS-generated audio response
- `rag_context`: Retrieved context from RAG (if applicable)
  - `sources`: Retrieved documents/FAQs used for response
  - `confidence`: RAG retrieval confidence
- `error`: Error message if processing fails

---

## Intent Types

The system supports the following intents:

| Intent | Description | Example Input (Vietnamese) | Example Slots |
|--------|-------------|---------------------------|---------------|
| `product_search` | Search for products | "Tìm iPhone dưới 20 triệu" | `product_name: "iPhone"`, `price_max: 20000000` |
| `product_filter_price` | Filter by price range | "Điện thoại từ 10 đến 15 triệu" | `price_min: 10000000`, `price_max: 15000000` |
| `product_compare` | Compare products | "So sánh iPhone 15 và Samsung S24" | `product_name: ["iPhone 15", "Samsung S24"]` |
| `add_to_cart` | Add item to cart | "Thêm cái thứ hai vào giỏ" | `product_id: "..."`, `quantity: 1` |
| `remove_from_cart` | Remove item from cart | "Xóa sản phẩm này khỏi giỏ" | `product_id: "..."` |
| `checkout_start` | Begin checkout | "Thanh toán" | (none) |
| `order_status` | Check order status | "Đơn hàng của tôi đâu?" | `order_id: "..."` |
| `customer_support_faq` | Answer FAQ | "Chính sách bảo hành là gì?" | `faq_topic: "warranty"` |
| `create_ticket` | Create support ticket | "Tôi muốn khiếu nại" | `category: "complaint"`, `message: "..."` |

---

## Action Types

Actions map directly to frontend operations:

| Action Type | Payload | Frontend Operation |
|-------------|---------|-------------------|
| `search` | `{ query: string, filters?: object }` | Navigate to search results |
| `navigate` | `{ route: string, params?: object }` | Navigate to route (e.g., product detail) |
| `add_to_cart` | `{ product_id: string, quantity: number }` | Call `useCartStore().addToCart()` |
| `remove_from_cart` | `{ product_id: string }` | Call `useCartStore().removeFromCart()` |
| `checkout` | `{}` | Navigate to checkout page |
| `compare` | `{ product_ids: string[] }` | Navigate to comparison view |
| `faq` | `{ answer: string, sources: array }` | Display FAQ answer |
| `order_status` | `{ order: object }` | Display order details |
| `create_ticket` | `{ ticket_id: string }` | Confirm ticket creation |

---

## Context-Aware Follow-ups

The system maintains context to handle follow-up queries:

**Example Flow**:
1. User: "Tìm iPhone" → Intent: `product_search`, Slots: `{product_name: "iPhone"}`
2. System returns search results via `context.last_intent` and `context.last_slots`
3. User: "Thêm cái thứ hai" → Intent: `add_to_cart`
   - System uses `context.last_intent = "product_search"` to resolve "cái thứ hai" = 2nd search result
   - Extracts `product_id` from search results stored in session

**Context Management**:
- Node/Bun maintains in-memory session map: `{ session_id → { last_intent, last_slots, search_results, cart } }`
- Python is stateless; receives full context in each request
- Context expires after 15 minutes of inactivity

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "string",
  "error_code": "STT_FAILED" | "TTS_FAILED" | "RAG_FAILED" | "INTENT_UNKNOWN" | "INVALID_INPUT",
  "details": "string?"
}
```

**Error Codes**:
- `STT_FAILED`: Audio transcription failed
- `TTS_FAILED`: Text-to-speech synthesis failed
- `RAG_FAILED`: Vector search or LLM generation failed
- `INTENT_UNKNOWN`: Could not classify intent
- `INVALID_INPUT`: Malformed request

---

## Example Payloads

### Example 1: Product Search

**Request** (`POST /voice-process`):
```json
{
  "session_id": "sess_12345",
  "audio_base64": "UklGRiQAAABXQVZF...",
  "language": "vi",
  "context": {}
}
```

**Response**:
```json
{
  "session_id": "sess_12345",
  "transcribed_text": "Tìm iPhone dưới 20 triệu",
  "intent": "product_search",
  "slots": {
    "product_name": "iPhone",
    "price_max": 20000000
  },
  "action": {
    "type": "search",
    "payload": {
      "query": "iPhone",
      "filters": { "maxPrice": 20000000 }
    }
  },
  "response_text": "Đây là các iPhone dưới 20 triệu đồng. Bạn có muốn xem chi tiết sản phẩm nào không?",
  "response_audio_base64": "UklGRiQAAABXQVZF...",
  "rag_context": {
    "sources": [
      { "type": "product", "name": "iPhone 13", "price": 15990000 }
    ],
    "confidence": 0.92
  }
}
```

### Example 2: Add to Cart (Follow-up)

**Request** (`POST /voice-process`):
```json
{
  "session_id": "sess_12345",
  "text": "Thêm cái thứ hai",
  "language": "vi",
  "context": {
    "last_intent": "product_search",
    "last_slots": { "product_name": "iPhone", "price_max": 20000000 }
  }
}
```

**Response**:
```json
{
  "session_id": "sess_12345",
  "transcribed_text": null,
  "intent": "add_to_cart",
  "slots": {
    "quantity": 1
  },
  "action": {
    "type": "add_to_cart",
    "payload": {
      "product_id": "673ad9bc45ba94834e1da123",
      "quantity": 1
    }
  },
  "response_text": "Đã thêm iPhone 14 vào giỏ hàng.",
  "response_audio_base64": "UklGRiQAAABXQVZF..."
}
```

### Example 3: FAQ Query

**Request** (`POST /voice-process`):
```json
{
  "session_id": "sess_12345",
  "audio_base64": "UklGRiQAAABXQVZF...",
  "language": "vi",
  "context": {}
}
```

**Response**:
```json
{
  "session_id": "sess_12345",
  "transcribed_text": "Chính sách bảo hành là gì?",
  "intent": "customer_support_faq",
  "slots": {
    "faq_topic": "warranty"
  },
  "action": {
    "type": "faq",
    "payload": {
      "answer": "Sản phẩm được bảo hành 12 tháng kể từ ngày mua.",
      "sources": ["faq_warranty_001"]
    }
  },
  "response_text": "Sản phẩm được bảo hành 12 tháng kể từ ngày mua. Bạn có thể mang sản phẩm đến các trung tâm bảo hành được ủy quyền.",
  "response_audio_base64": "UklGRiQAAABXQVZF...",
  "rag_context": {
    "sources": [
      { "type": "faq", "id": "faq_warranty_001", "question": "Chính sách bảo hành?", "answer": "..." }
    ],
    "confidence": 0.95
  }
}
```

---

## BullMQ Integration

For handling long-running or batch operations, the Python service uses **BullMQ** for job queuing.

### Queue: `voice-processing`

**Use Cases**:
- Batch embedding generation
- Concurrent STT/TTS requests
- Performance load simulation

**Job Schema**:
```json
{
  "jobId": "string",
  "type": "stt" | "tts" | "voice-process" | "embed" | "batch-embed",
  "data": {
    "session_id": "string",
    "audio_base64": "string?",
    "text": "string?",
    "context": "object?"
  },
  "priority": 1-10,
  "timestamp": "ISO8601"
}
```

**Job Result**:
```json
{
  "jobId": "string",
  "status": "completed" | "failed",
  "result": "object",
  "error": "string?",
  "duration_ms": 0
}
```

**API Endpoint** (`POST /queue/voice`):
```json
Request:
{
  "session_id": "string",
  "audio_base64": "string",
  "priority": 5
}

Response:
{
  "job_id": "string",
  "status": "pending",
  "queue_position": 3
}
```

**API Endpoint** (`GET /queue/voice/:job_id`):
```json
Response:
{
  "job_id": "string",
  "status": "completed" | "pending" | "failed",
  "result": "object?",
  "error": "string?"
}
```

---

## Performance Targets

- **Median Round Trip**: < 2.5s (STT + RAG + TTS)
- **Concurrent Users**: 100 (simulated via API-only load, not real audio)
- **Timeout**: 10s per request

---

## Notes

- All timestamps are ISO 8601 format
- All prices are in VND (Vietnamese Dong)
- Audio format: WAV, 16kHz, mono, 16-bit PCM
- Base64 encoding uses standard padding
- Session IDs are UUIDs v4
