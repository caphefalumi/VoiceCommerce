package com.tgdd.api.controllers;

import com.tgdd.api.dto.CartItemDto;
import com.tgdd.api.models.User;
import com.tgdd.api.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final UserRepository userRepository;

    public CartController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getCart(@AuthenticationPrincipal User user) {
        if (user == null)
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));

        return userRepository.findById(user.getId())
                .<ResponseEntity<Object>>map(u -> ResponseEntity.ok(u.getCart()))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("error", "User not found")));
    }

    @PostMapping
    public ResponseEntity<?> saveCart(@AuthenticationPrincipal User user, @RequestBody List<CartItemDto> cart) {
        if (user == null)
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));

        return userRepository.findById(user.getId())
                .<ResponseEntity<Object>>map(u -> {
                    u.setCart(cart);
                    userRepository.save(u);
                    return ResponseEntity.ok(u.getCart());
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("error", "User not found")));
    }
}
