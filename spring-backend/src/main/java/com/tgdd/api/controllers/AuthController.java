package com.tgdd.api.controllers;

import com.tgdd.api.dto.LoginRequest;
import com.tgdd.api.dto.RegisterRequest;
import com.tgdd.api.models.User;
import com.tgdd.api.repositories.UserRepository;
import com.tgdd.api.security.JwtUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthController(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    /** POST /api/auth/register */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (req.email() == null || req.email().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        if (req.password() == null || req.password().length() < 6)
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        if (userRepository.existsByEmail(req.email()))
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));

        User user = User.builder()
                .email(req.email().toLowerCase().trim())
                .name(req.name() != null ? req.name().trim() : req.email().split("@")[0])
                .password(passwordEncoder.encode(req.password()))
                .build();

        userRepository.save(user);
        String token = jwtUtils.generateToken(user.getEmail());

        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", Map.of(
                        "id", user.getId(),
                        "email", user.getEmail(),
                        "name", user.getName(),
                        "role", user.getRole())));
    }

    /** POST /api/auth/login */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        return userRepository.findByEmail(req.email().toLowerCase().trim())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPassword()))
                .map(user -> {
                    String token = jwtUtils.generateToken(user.getEmail());
                    return ResponseEntity.ok(Map.of(
                            "token", token,
                            "user", Map.of(
                                    "id", user.getId(),
                                    "email", user.getEmail(),
                                    "name", user.getName(),
                                    "role", user.getRole())));
                })
                .orElseGet(() -> ResponseEntity.status(401)
                        .body(Map.of("error", "Invalid email or password")));
    }

    /** GET /api/auth/me — requires valid JWT */
    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal User user) {
        if (user == null)
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "name", user.getName(),
                "role", user.getRole()));
    }
}
