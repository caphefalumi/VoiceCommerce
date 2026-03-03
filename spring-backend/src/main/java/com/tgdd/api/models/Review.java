package com.tgdd.api.models;

import java.util.Date;

public class Review {
    private String content;
    private int rating;
    private String author;
    private Date date;

    // Getters and Setters
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public Date getDate() { return date; }
    public void setDate(Date date) { this.date = date; }
}
