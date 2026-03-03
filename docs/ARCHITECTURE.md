# Voice Commerce Architecture - TGDD

## System Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Frontend - React Client"]
        UI["Voice UI\n(Microphone Button)"]
        VA["VoiceAssistant\nComponent"]
        Cart["Cart Store\n(Zustand)"]
        Router["React Router"]
    end

    subgraph Cloud["Cloudflare Edge"]
        Worker["AI Worker\n(Voice Orchestration)"]
        STT["Whisper STT\n@cf/openai/whisper"]
        LLM["Llama 3.8B\n@cf/meta/llama-3-8b-instruct"]
        TTS["Melo TTS\n@cf/myshell-ai/melo-tts"]
    end

    subgraph Backend["Spring Boot Backend"]
        API["REST API\n:8080"]
        VoiceCtl["VoiceController\n/api/voice"]
        ProdCtl["ProductController\n/api/products"]
        CartCtl["CartController\n/api/cart"]
    end

    subgraph Database["MongoDB"]
        Products["Products\nCollection"]
        Users["Users\nCollection"]
        Orders["Orders\nCollection"]
    end

    %% Frontend connections
    UI --> VA
    VA -->|1. Audio| Worker
    VA --> Cart
    VA --> Router

    %% Worker connections
    Worker -->|2. STT| STT
    STT -->|3. Text| Worker
    Worker -->|4. Intent| LLM
    LLM -->|5. Response| Worker
    Worker -->|6. TTS| TTS
    Worker -->|7. JSON| API

    %% Backend connections
    API --> VoiceCtl
    API --> ProdCtl
    API --> CartCtl

    ProdCtl -->|Query| Products
    CartCtl -->|Read/Write| Users

    style Worker fill:#f680,stroke:#333
    style STT fill:#a8e6cf,stroke:#333
    style LLM fill:#dda0dd,stroke:#333
    style TTS fill:#87ceeb,stroke:#333
    style Backend fill:#ffd700,stroke:#333
    style Database fill:#ff6b6b,stroke:#333
```

## Voice Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Worker
    participant STT
    participant LLM
    participant Backend
    participant DB

    User->>Frontend: "Tìm iPhone 15"
    Frontend->>Frontend: Record audio\nconvertToWav
    
    Frontend->>Worker: POST /api/voice\n{audio_base64}
    
    Worker->>STT: Whisper STT\n(language: "vi")
    STT-->>Worker: "tìm iPhone 15"
    
    Worker->>LLM: Intent Classification\n(systemPrompt)
    LLM-->>Worker: {intent: "product_search", query: "iPhone 15"}
    
    Worker->>Backend: GET /api/products?search=iPhone 15
    Backend->>DB: Find products
    DB-->>Backend: [iPhone 15 Pro, iPhone 15, ...]
    Backend-->>Worker: [Products]
    
    Worker-->>Frontend: {intent: "list_products", results: [...], response_text}
    
    Frontend->>User: Show product list\n"Chọn cái đầu tiên?"
    
    User->>Frontend: "Chọn cái đầu tiên"
    Frontend->>Worker: POST /api/voice\n{audio_base64}
    
    Worker->>LLM: Intent: add_to_cart\nselection: "first"
    Worker->>Backend: GET /api/products?search=iPhone 15
    Backend-->>Worker: [Products]
    
    Worker-->>Frontend: {intent: "add_to_cart", product: {...}}
    
    Frontend->>User: "Đã thêm iPhone 15 Pro\nvào giỏ hàng!"
```

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph Input["Voice Input"]
        Mic["Microphone"]
        WebM["WebM Audio"]
        WAV["WAV (16kHz)"]
        Base64["Base64"]
    end

    subgraph Processing["AI Processing"]
        STT1["Speech-to-Text\n(Whisper)"]
        Norm["Product Name\nNormalization"]
        Intent["Intent\nClassification"]
        RAG["Product\nSearch (RAG)"]
    end

    subgraph Output["Output"]
        Cart["Add to Cart"]
        TTS["Text-to-Speech\n(Melo)"]
        Display["Display\nProducts"]
    end

    Mic --> WebM --> WAV --> Base64 --> STT1
    STT1 --> Norm --> Intent --> RAG
    RAG --> Cart
    RAG --> Display
    RAG --> TTS
```

## Component Details

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + Vite | Voice UI, cart management |
| Worker | Cloudflare Workers | Voice orchestration, AI gateway |
| STT | Whisper (CF) | Vietnamese speech recognition |
| LLM | Llama 3.8B (CF) | Intent classification, response generation |
| TTS | MeloTTS (CF) | Vietnamese text-to-speech |
| Backend | Spring Boot | REST APIs, business logic |
| Database | MongoDB | Products, users, orders |

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Production["Production (AWS/Azure)"]
        CDN["CloudFront/CDN"]
        S3["S3 Bucket\n(Static Files)"]
        ECS["ECS Fargate\n(Spring Boot)"]
        Atlas["MongoDB Atlas\n(Database)"]
    end

    subgraph Cloudflare["Cloudflare"]
        WorkerDeployed["AI Worker\n(Deployed)"]
        WorkersKV["Workers KV\n(Session)"]
    end

    CDN --> S3
    CDN --> ECS
    ECS --> Atlas
    WorkerDeployed --> WorkersKV
    
    style Production fill:#e1f5fe,stroke:#01579b
    style Cloudflare fill:#fff3e0,stroke:#e65100
```

---

This diagram shows the complete voice commerce architecture for your TGDD project. You can use this for your RFP documentation (Section 7 - Architecture diagrams).
