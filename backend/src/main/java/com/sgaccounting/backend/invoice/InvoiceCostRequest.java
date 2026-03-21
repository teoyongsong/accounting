package com.sgaccounting.backend.invoice;

import java.math.BigDecimal;
import java.time.LocalDate;

public class InvoiceCostRequest {

    private LocalDate costDate;
    private String description;
    private String category;
    private BigDecimal amount;

    public LocalDate getCostDate() { return costDate; }
    public void setCostDate(LocalDate costDate) { this.costDate = costDate; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
