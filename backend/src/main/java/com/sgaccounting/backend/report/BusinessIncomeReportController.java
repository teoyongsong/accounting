package com.sgaccounting.backend.report;

import com.sgaccounting.backend.expense.ExpenseRepository;
import com.sgaccounting.backend.invoice.Invoice;
import com.sgaccounting.backend.invoice.InvoiceRepository;
import com.sgaccounting.backend.invoice.InvoiceCost;
import com.sgaccounting.backend.invoice.InvoiceCostRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports/business-income")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class BusinessIncomeReportController {

    private final InvoiceRepository invoiceRepo;
    private final ExpenseRepository expenseRepo;
    private final InvoiceCostRepository invoiceCostRepo;

    public BusinessIncomeReportController(
            InvoiceRepository invoiceRepo,
            ExpenseRepository expenseRepo,
            InvoiceCostRepository invoiceCostRepo) {
        this.invoiceRepo = invoiceRepo;
        this.expenseRepo = expenseRepo;
        this.invoiceCostRepo = invoiceCostRepo;
    }

    @GetMapping
    public Map<String, Object> report(@RequestParam("year") int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);

        BigDecimal revenue = invoiceRepo.findAll().stream()
                .filter(inv -> !inv.getIssueDate().isBefore(start) && !inv.getIssueDate().isAfter(end))
                .map(Invoice::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal costOfSales = invoiceCostRepo.findByCostDateBetween(start, end).stream()
                .map(InvoiceCost::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal expenses = expenseRepo.findByDateBetween(start, end).stream()
                .map(e -> e.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal grossProfit = revenue.subtract(costOfSales);
        BigDecimal adjustedProfit = grossProfit.subtract(expenses);

        Map<String, Object> result = new HashMap<>();
        result.put("year", year);
        result.put("revenue", revenue);
        result.put("costOfSales", costOfSales);
        result.put("grossProfit", grossProfit);
        result.put("allowableExpenses", expenses);
        result.put("adjustedProfit", adjustedProfit);
        result.put(
                "statementType",
                revenue.compareTo(new BigDecimal("200000")) <= 0 ? "2_LINE" : "4_LINE");
        return result;
    }
}

