package com.sgaccounting.backend.dashboard;

import com.sgaccounting.backend.expense.ExpenseRepository;
import com.sgaccounting.backend.invoice.Invoice;
import com.sgaccounting.backend.invoice.InvoiceCost;
import com.sgaccounting.backend.invoice.InvoiceCostRepository;
import com.sgaccounting.backend.invoice.InvoiceRepository;
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
@RequestMapping("/api/dashboard")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class DashboardSummaryController {

    private final InvoiceRepository invoiceRepo;
    private final InvoiceCostRepository costRepo;
    private final ExpenseRepository expenseRepo;

    public DashboardSummaryController(
            InvoiceRepository invoiceRepo,
            InvoiceCostRepository costRepo,
            ExpenseRepository expenseRepo) {
        this.invoiceRepo = invoiceRepo;
        this.costRepo = costRepo;
        this.expenseRepo = expenseRepo;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(@RequestParam("year") int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);

        java.util.List<Invoice> invoices =
                invoiceRepo.findAll().stream()
                        .filter(inv -> !inv.getIssueDate().isBefore(start)
                                && !inv.getIssueDate().isAfter(end))
                        .toList();
        BigDecimal invoiceTotal =
                invoices.stream().map(Invoice::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        java.util.List<InvoiceCost> costs = costRepo.findByCostDateBetween(start, end);
        BigDecimal costTotal =
                costs.stream()
                        .map(InvoiceCost::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        java.util.List<com.sgaccounting.backend.expense.Expense> expenses =
                expenseRepo.findByDateBetween(start, end);
        BigDecimal expenseTotal =
                expenses.stream()
                        .map(e -> e.getAmount())
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new HashMap<>();
        result.put("year", year);

        Map<String, Object> invoicesMap = new HashMap<>();
        invoicesMap.put("count", invoices.size());
        invoicesMap.put("totalAmount", invoiceTotal);
        result.put("invoices", invoicesMap);

        Map<String, Object> costsMap = new HashMap<>();
        costsMap.put("count", costs.size());
        costsMap.put("totalAmount", costTotal);
        result.put("costs", costsMap);

        Map<String, Object> expensesMap = new HashMap<>();
        expensesMap.put("count", expenses.size());
        expensesMap.put("totalAmount", expenseTotal);
        result.put("expenses", expensesMap);

        // Summary aligned with Business Income: Revenue - Cost of sales - Expenses = Adjusted profit
        BigDecimal revenue = invoiceTotal != null ? invoiceTotal : BigDecimal.ZERO;
        BigDecimal costOfSales = costTotal != null ? costTotal : BigDecimal.ZERO;
        BigDecimal allowableExpenses = expenseTotal != null ? expenseTotal : BigDecimal.ZERO;
        BigDecimal adjustedProfit = revenue.subtract(costOfSales).subtract(allowableExpenses);

        result.put("revenue", revenue);
        result.put("costOfSales", costOfSales);
        result.put("allowableExpenses", allowableExpenses);
        result.put("adjustedProfit", adjustedProfit);

        return result;
    }
}

