package com.tgdd.api.dto;

import java.util.List;
import java.util.Map;

public class ProductDto {
    private String id;
    private String name;
    private String brand;
    private double price;
    private Double originalPrice;
    private int discountPercentage;
    private List<String> images;
    private String category;
    private Map<String, String> specs;
    private double rating;
    private int reviewCount;
    private int stock;
    private String description;
    private boolean isFlashSale;
    private boolean isNew;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public Double getOriginalPrice() { return originalPrice; }
    public void setOriginalPrice(Double originalPrice) { this.originalPrice = originalPrice; }

    public int getDiscountPercentage() { return discountPercentage; }
    public void setDiscountPercentage(int discountPercentage) { this.discountPercentage = discountPercentage; }

    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Map<String, String> getSpecs() { return specs; }
    public void setSpecs(Map<String, String> specs) { this.specs = specs; }

    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public int getReviewCount() { return reviewCount; }
    public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }

    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isFlashSale() { return isFlashSale; }
    public void setFlashSale(boolean flashSale) { this.isFlashSale = flashSale; }

    public boolean isNew() { return isNew; }
    public void setNew(boolean isNew) { this.isNew = isNew; }
}
