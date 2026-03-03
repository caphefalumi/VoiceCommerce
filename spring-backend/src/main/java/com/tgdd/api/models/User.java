package com.tgdd.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.tgdd.api.dto.CartItemDto;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String password; // bcrypt hashed

    private String name;

    @Builder.Default
    private String role = "USER"; // USER | ADMIN

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private List<CartItemDto> cart = new ArrayList<>();
}
