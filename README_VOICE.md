# Voice Commerce Demo Setup Guide

This guide explains how to set up and run the Voice Commerce Demo (Topic 37).

## Prerequisites

1.  **Node.js / Bun**: Ensure Bun is installed (`bun -v`).
2.  **Python 3.10+**: Ensure Python is installed.
3.  **MongoDB**: Ensure a local MongoDB instance is running at `mongodb://localhost:27017` or update `MONGO_URI` in `.env`.
4.  **Hardware**: Microphone and Speakers.

## Step 1: Install Dependencies

### Frontend & API Server
```bash
bun install
```

### Python Microservice
```bash
pip install -r requirements.txt
```
*Note: If you are on Windows, you might need to install `piper-tts` manually or ensure `espeak-ng` is available if the wheel doesn't bundle it.*

## Step 2: Download AI Models

Run the setup script to download the Speech-to-Text (Zipformer) and Text-to-Speech (Piper) models.

```bash
python backend/download_models.py
```
This will download models to `models/stt` and `models/tts`.

## Step 3: Run the Services

You need to run two processes in parallel.

### 1. Python Voice Service
This service handles STT, TTS, RAG, and Intent Classification.
```bash
python -m backend.main
```
*Port: 8000*

### 2. Main Application (Frontend + API Proxy)
This runs the Vite dev server and the Bun API server.
```bash
bun run app
```
*Frontend: http://localhost:5173*
*API: http://localhost:3000*

## Step 4: Verify the Demo

1.  Open `http://localhost:5173`.
2.  Click the **Voice Assistant** button (bottom right yellow button).
3.  **Speak**: "Find iPhone 15" or "Search for Samsung Galaxy".
    *   You should see the text appear, then a response from the assistant, and product results if found.
4.  **Speak**: "Add to cart".
    *   The assistant should add the found product to your cart.
5.  **Speak**: "Checkout".
    *   The app should navigate to the checkout page.

## Troubleshooting

-   **Microphone Error**: Ensure your browser allows microphone access for localhost.
-   **TTS No Sound**: Check server logs (`python -m backend.main`) for TTS errors. Verify `models/tts` has `.onnx` and `.json` files.
-   **No Products Found**: Ensure you have seeded the database. Run `bun seed`.
-   **Python Import Errors**: Make sure you installed all requirements and are running from the root directory.

## Architecture

-   **Frontend**: React + Vite + MediaRecorder API.
-   **Orchestration**: Bun Server (`/api/voice`) proxies to Python Service.
-   **Python Service**: FastAPI.
    -   **STT**: Sherpa-ONNX (Zipformer).
    -   **TTS**: Piper TTS.
    -   **RAG**: MongoDB + Qwen-0.5B (via Transformers) + SentenceTransformers.
    -   **Intent**: Regex/Keyword matching (fallback to LLM planned).
