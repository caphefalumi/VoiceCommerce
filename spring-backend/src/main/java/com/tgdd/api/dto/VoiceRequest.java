package com.tgdd.api.dto;

import java.util.Map;

public class VoiceRequest {
    private String session_id;
    private String audio_base64;
    private String text;
    private String language;
    private Map<String, Object> context;

    public String getSession_id() {
        return session_id;
    }

    public void setSession_id(String session_id) {
        this.session_id = session_id;
    }

    public String getAudio_base64() {
        return audio_base64;
    }

    public void setAudio_base64(String audio_base64) {
        this.audio_base64 = audio_base64;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public Map<String, Object> getContext() {
        return context;
    }

    public void setContext(Map<String, Object> context) {
        this.context = context;
    }
}
