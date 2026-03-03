package com.tgdd.api.controllers;

import com.tgdd.api.dto.VoiceRequest;
import com.tgdd.api.dto.VoiceResponse;
import com.tgdd.api.services.VoiceOrchestrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/voice")
@CrossOrigin(origins = "*")
public class VoiceController {

    @Autowired
    private VoiceOrchestrationService voiceService;

    @PostMapping
    public ResponseEntity<VoiceResponse> processVoice(@RequestBody VoiceRequest request) {
        VoiceResponse response = voiceService.processVoice(request);
        if (response.getError() != null) {
            return ResponseEntity.status(500).body(response);
        }
        return ResponseEntity.ok(response);
    }
}
