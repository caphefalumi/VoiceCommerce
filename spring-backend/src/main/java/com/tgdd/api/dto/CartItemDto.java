package com.tgdd.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemDto {
    private String id;
    private String name;
    private int price;
    private String image;
    private String category;
    private int quantity;
}
