package com.tgdd.api.dto;

import java.util.Map;

public class VoiceResponse {
    private String session_id;
    private String transcribed_text;
    private String intent;
    private Map<String, Object> action;
    private String response_text;
    // Named audio_base64 to match what the frontend and Worker both use
    private String audio_base64;
    private String error;
    private String details;

    public String getSession_id() {
        return session_id;
    }

    public void setSession_id(String session_id) {
        this.session_id = session_id;
    }

    public String getTranscribed_text() {
        return transcribed_text;
    }

    public void setTranscribed_text(String transcribed_text) {
        this.transcribed_text = transcribed_text;
    }

    public String getIntent() {
        return intent;
    }

    public void setIntent(String intent) {
        this.intent = intent;
    }

    public Map<String, Object> getAction() {
        return action;
    }

    public void setAction(Map<String, Object> action) {
        this.action = action;
    }

    public String getResponse_text() {
        return response_text;
    }

    public void setResponse_text(String response_text) {
        this.response_text = response_text;
    }

    public String getAudio_base64() {
        return audio_base64;
    }

    public void setAudio_base64(String audio_base64) {
        this.audio_base64 = audio_base64;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
