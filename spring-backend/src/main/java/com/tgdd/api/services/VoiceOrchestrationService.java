package com.tgdd.api.services;

import com.tgdd.api.dto.VoiceRequest;
import com.tgdd.api.dto.VoiceResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VoiceOrchestrationService {

    // Simple in-memory session store for demo purposes
    private final Map<String, Map<String, Object>> sessionStore = new ConcurrentHashMap<>();

    private static final String WORKER_URL = "https://ai-worker.dangduytoan13l.workers.dev/voice-process";

    private final RestTemplate restTemplate = new RestTemplate();

    @SuppressWarnings("unchecked")
    public VoiceResponse processVoice(VoiceRequest request) {
        Map<String, Object> context = sessionStore.getOrDefault(request.getSession_id(), new HashMap<>());

        // Merge frontend-provided context (e.g., last_products for selection)
        if (request.getContext() != null) {
            context.putAll(request.getContext());
        }

        // Build payload for the Worker /voice-process endpoint
        Map<String, Object> workerPayload = new HashMap<>();
        workerPayload.put("session_id", request.getSession_id());
        if (request.getAudio_base64() != null) {
            workerPayload.put("audio_base64", request.getAudio_base64());
        }
        if (request.getText() != null) {
            workerPayload.put("text", request.getText());
        }
        workerPayload.put("context", context);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(workerPayload, headers);

        try {
            // Call the Worker orchestration endpoint; get back a raw Map to avoid type
            // erasure
            Map<String, Object> raw = restTemplate.postForObject(WORKER_URL, entity, Map.class);

            VoiceResponse response = new VoiceResponse();
            if (raw == null) {
                response.setError("Empty response from AI worker");
                return response;
            }

            response.setSession_id(request.getSession_id());
            response.setTranscribed_text((String) raw.get("transcribed_text"));
            response.setIntent((String) raw.get("intent"));
            response.setResponse_text((String) raw.get("response_text"));
            // The Worker returns audio_base64; map it to the DTO field the frontend reads
            response.setAudio_base64((String) raw.get("audio_base64"));
            response.setError((String) raw.get("error"));

            if (raw.get("action") instanceof Map) {
                response.setAction((Map<String, Object>) raw.get("action"));
            }

            // Update session context
            if (response.getIntent() != null) {
                Map<String, Object> newContext = new HashMap<>(context);
                newContext.put("last_intent", response.getIntent());
                if (response.getTranscribed_text() != null) {
                    newContext.put("last_text", response.getTranscribed_text());
                }
                // Store last_products from search/filter results for future selection
                if (response.getAction() != null && response.getAction().get("payload") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> payload = (Map<String, Object>) response.getAction().get("payload");
                    if (payload.containsKey("results")) {
                        newContext.put("last_products", payload.get("results"));
                    }
                }
                sessionStore.put(request.getSession_id(), newContext);
            }
            return response;

        } catch (Exception e) {
            VoiceResponse errorResponse = new VoiceResponse();
            errorResponse.setError("Voice orchestration failed");
            errorResponse.setDetails(e.getMessage());
            return errorResponse;
        }
    }
}
