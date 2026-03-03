package com.tgdd.api.controllers;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    @Autowired
    private MongoTemplate mongoTemplate;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getProducts(
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "minPrice", required = false) Double minPrice,
            @RequestParam(name = "maxPrice", required = false) Double maxPrice) {

        System.out.println("DB: " + mongoTemplate.getDb().getName());

        Query query = new Query();

        if (category != null && !category.isEmpty()) {
            query.addCriteria(Criteria.where("category").is(category));
        }
        if (search != null && !search.isEmpty()) {
            query.addCriteria(Criteria.where("name")
                    .regex(Pattern.compile(search, Pattern.CASE_INSENSITIVE)));
        }
        if (minPrice != null || maxPrice != null) {
            Criteria priceCriteria = Criteria.where("price");
            if (minPrice != null)
                priceCriteria.gte(minPrice);
            if (maxPrice != null)
                priceCriteria.lte(maxPrice);
            query.addCriteria(priceCriteria);
        }
        query.limit(200);

        List<Document> docs = mongoTemplate.find(query, Document.class, "products");
        List<Map<String, Object>> result = docs.stream()
                .map(this::toProductDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProductById(@PathVariable("id") String id) {
        try {
            Query query = new Query(Criteria.where("_id").is(new ObjectId(id)));
            Document doc = mongoTemplate.findOne(query, Document.class, "products");
            if (doc == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(toProductDto(doc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toProductDto(Document doc) {
        Map<String, Object> dto = new LinkedHashMap<>();

        Object rawId = doc.get("_id");
        dto.put("id", rawId != null ? rawId.toString() : null);
        dto.put("name", doc.getString("name"));
        dto.put("brand", getStrOrDefault(doc, "brand", "Unknown"));
        dto.put("price", doc.get("price"));
        dto.put("originalPrice", doc.get("originalPrice"));
        dto.put("category", doc.getString("category"));
        dto.put("rating", doc.get("rating"));
        dto.put("reviewCount", doc.get("reviewCount"));
        dto.put("stock", doc.get("stock"));
        dto.put("description", doc.getString("description"));
        dto.put("images", doc.getList("images", String.class, Collections.emptyList()));

        // Compute discountPercentage
        Number price = (Number) doc.get("price");
        Number origPrice = (Number) doc.get("originalPrice");
        int discount = 0;
        if (price != null && origPrice != null && origPrice.doubleValue() > price.doubleValue()) {
            discount = (int) Math.round(
                    ((origPrice.doubleValue() - price.doubleValue()) / origPrice.doubleValue()) * 100);
        }
        dto.put("discountPercentage", discount);
        dto.put("isFlashSale", discount >= 10);
        dto.put("isNew", false);

        // specs: stored as [{label, value}] → convert to Record<string,string>
        List<Document> specsDocs = (List<Document>) doc.get("specs");
        Map<String, String> specsMap = new LinkedHashMap<>();
        if (specsDocs != null) {
            for (Document s : specsDocs) {
                String label = s.getString("label");
                String value = s.getString("value");
                if (label != null)
                    specsMap.put(label, value != null ? value : "");
            }
        }
        dto.put("specs", specsMap);

        // reviews
        List<Document> reviewDocs = (List<Document>) doc.get("reviews");
        List<Map<String, Object>> reviews = new ArrayList<>();
        if (reviewDocs != null) {
            for (Document r : reviewDocs) {
                Map<String, Object> rev = new LinkedHashMap<>();
                Object rid = r.get("_id");
                rev.put("id", rid != null ? rid.toString() : UUID.randomUUID().toString());
                rev.put("userName", getStrOrDefault(r, "author", "Anonymous"));
                rev.put("rating", r.get("rating"));
                rev.put("comment", getStrOrDefault(r, "content", ""));
                rev.put("date", r.get("date") != null ? r.get("date").toString() : "");
                reviews.add(rev);
            }
        }
        dto.put("reviews", reviews);

        return dto;
    }

    private String getStrOrDefault(Document doc, String key, String defaultVal) {
        String v = doc.getString(key);
        return (v == null || v.isEmpty()) ? defaultVal : v;
    }
}
