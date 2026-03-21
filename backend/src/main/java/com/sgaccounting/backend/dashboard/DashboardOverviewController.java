package com.sgaccounting.backend.dashboard;

import com.sgaccounting.backend.client.Client;
import com.sgaccounting.backend.client.ClientRepository;
import com.sgaccounting.backend.expense.Expense;
import com.sgaccounting.backend.expense.ExpenseRepository;
import com.sgaccounting.backend.invoice.Invoice;
import com.sgaccounting.backend.invoice.InvoiceCost;
import com.sgaccounting.backend.invoice.InvoiceCostRepository;
import com.sgaccounting.backend.invoice.InvoiceRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class DashboardOverviewController {

    private final InvoiceRepository invoiceRepo;
    private final InvoiceCostRepository costRepo;
    private final ExpenseRepository expenseRepo;
    private final ClientRepository clientRepo;

    public DashboardOverviewController(
            InvoiceRepository invoiceRepo,
            InvoiceCostRepository costRepo,
            ExpenseRepository expenseRepo,
            ClientRepository clientRepo) {
        this.invoiceRepo = invoiceRepo;
        this.costRepo = costRepo;
        this.expenseRepo = expenseRepo;
        this.clientRepo = clientRepo;
    }

    @GetMapping("/overview")
    public Map<String, Object> overview(@RequestParam("year") int year) {
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = LocalDate.of(year, 12, 31);

        LocalDate today = LocalDate.now();
        LocalDate mtdStart = LocalDate.of(year, today.getMonthValue(), 1);
        LocalDate mtdEnd = LocalDate.of(year, today.getMonthValue(), today.lengthOfMonth());

        List<Invoice> invoicesYtd = invoiceRepo.findByIssueDateBetween(yearStart, yearEnd);
        List<InvoiceCost> costsYtd = costRepo.findByCostDateBetween(yearStart, yearEnd);
        List<Expense> expensesYtd = expenseRepo.findByDateBetween(yearStart, yearEnd);

        BigDecimal revenueYtd = sumInvoices(invoicesYtd);
        BigDecimal costYtd = sumCosts(costsYtd);
        BigDecimal expensesYtdTotal = sumExpenses(expensesYtd);
        BigDecimal profitYtd = revenueYtd.subtract(costYtd).subtract(expensesYtdTotal);

        // MTD: filter in memory from YTD lists
        BigDecimal revenueMtd = sumInvoices(filterInvoicesBetween(invoicesYtd, mtdStart, mtdEnd));
        BigDecimal costMtd = sumCosts(filterCostsBetween(costsYtd, mtdStart, mtdEnd));
        BigDecimal expensesMtd = sumExpenses(filterExpensesBetween(expensesYtd, mtdStart, mtdEnd));
        BigDecimal profitMtd = revenueMtd.subtract(costMtd).subtract(expensesMtd);

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("revenueYtd", revenueYtd);
        kpis.put("revenueMtd", revenueMtd);
        kpis.put("costYtd", costYtd);
        kpis.put("costMtd", costMtd);
        kpis.put("expensesYtd", expensesYtdTotal);
        kpis.put("expensesMtd", expensesMtd);
        kpis.put("profitYtd", profitYtd);
        kpis.put("profitMtd", profitMtd);

        List<Map<String, Object>> monthly = buildMonthlySeries(year, invoicesYtd, costsYtd, expensesYtd);

        Map<String, Object> overdue = buildOverdue(invoicesYtd, today);

        List<Map<String, Object>> topClients = buildTopClients(invoicesYtd);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("year", year);
        result.put("kpis", kpis);
        result.put("monthly", monthly);
        result.put("overdue", overdue);
        result.put("topClients", topClients);
        return result;
    }

    private BigDecimal sumInvoices(List<Invoice> invoices) {
        return invoices.stream()
                .map(Invoice::getAmount)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumCosts(List<InvoiceCost> costs) {
        return costs.stream()
                .map(InvoiceCost::getAmount)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumExpenses(List<Expense> expenses) {
        return expenses.stream()
                .map(Expense::getAmount)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<Invoice> filterInvoicesBetween(List<Invoice> invoices, LocalDate start, LocalDate end) {
        return invoices.stream()
                .filter(i -> i.getIssueDate() != null
                        && !i.getIssueDate().isBefore(start)
                        && !i.getIssueDate().isAfter(end))
                .toList();
    }

    private List<InvoiceCost> filterCostsBetween(List<InvoiceCost> costs, LocalDate start, LocalDate end) {
        return costs.stream()
                .filter(c -> c.getCostDate() != null
                        && !c.getCostDate().isBefore(start)
                        && !c.getCostDate().isAfter(end))
                .toList();
    }

    private List<Expense> filterExpensesBetween(List<Expense> expenses, LocalDate start, LocalDate end) {
        return expenses.stream()
                .filter(e -> e.getDate() != null
                        && !e.getDate().isBefore(start)
                        && !e.getDate().isAfter(end))
                .toList();
    }

    private List<Map<String, Object>> buildMonthlySeries(
            int year,
            List<Invoice> invoicesYtd,
            List<InvoiceCost> costsYtd,
            List<Expense> expensesYtd) {
        List<Map<String, Object>> monthly = new ArrayList<>();

        for (int month = 1; month <= 12; month++) {
            LocalDate start = LocalDate.of(year, month, 1);
            LocalDate end = LocalDate.of(year, month, start.lengthOfMonth());

            BigDecimal revenue = sumInvoices(filterInvoicesBetween(invoicesYtd, start, end));
            BigDecimal cost = sumCosts(filterCostsBetween(costsYtd, start, end));
            BigDecimal expenses = sumExpenses(filterExpensesBetween(expensesYtd, start, end));
            BigDecimal profit = revenue.subtract(cost).subtract(expenses);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", month);
            row.put("revenue", revenue);
            row.put("costOfSales", cost);
            row.put("expenses", expenses);
            row.put("adjustedProfit", profit);
            monthly.add(row);
        }

        return monthly;
    }

    private Map<String, Object> buildOverdue(List<Invoice> invoicesYtd, LocalDate today) {
        List<Map<String, Object>> overdueInvoices = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (Invoice inv : invoicesYtd) {
            if (inv.getDueDate() == null) continue;
            if (!inv.getDueDate().isBefore(today)) continue;
            String status = inv.getStatus() != null ? inv.getStatus() : "";
            if ("PAID".equalsIgnoreCase(status)) continue;

            BigDecimal amount = inv.getAmount() != null ? inv.getAmount() : BigDecimal.ZERO;
            total = total.add(amount);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", inv.getId());
            row.put("invoiceNumber", inv.getInvoiceNumber());
            row.put("clientId", inv.getClientId());
            row.put("customerName", inv.getCustomerName());
            row.put("issueDate", inv.getIssueDate());
            row.put("dueDate", inv.getDueDate());
            row.put("amount", amount);
            row.put("status", inv.getStatus());
            overdueInvoices.add(row);
        }

        overdueInvoices.sort(Comparator
                .comparing((Map<String, Object> m) -> Optional.ofNullable((LocalDate) m.get("dueDate")).orElse(LocalDate.MIN))
                .thenComparing(m -> String.valueOf(m.get("invoiceNumber"))));

        Map<String, Object> overdue = new LinkedHashMap<>();
        overdue.put("totalAmount", total);
        overdue.put("invoices", overdueInvoices);
        return overdue;
    }

    private List<Map<String, Object>> buildTopClients(List<Invoice> invoicesYtd) {
        Map<Long, BigDecimal> revenueByClientId = new HashMap<>();
        Map<String, BigDecimal> revenueByCustomerName = new HashMap<>();

        for (Invoice inv : invoicesYtd) {
            BigDecimal amount = inv.getAmount() != null ? inv.getAmount() : BigDecimal.ZERO;
            Long clientId = inv.getClientId();
            if (clientId != null) {
                revenueByClientId.put(clientId, revenueByClientId.getOrDefault(clientId, BigDecimal.ZERO).add(amount));
            } else {
                String name = inv.getCustomerName() != null ? inv.getCustomerName() : "Unknown";
                revenueByCustomerName.put(name, revenueByCustomerName.getOrDefault(name, BigDecimal.ZERO).add(amount));
            }
        }

        Map<Long, String> clientNames = new HashMap<>();
        for (Client c : clientRepo.findAll()) {
            clientNames.put(c.getId(), c.getName());
        }

        List<Map<String, Object>> rows = new ArrayList<>();

        revenueByClientId.entrySet().stream()
                .sorted(Map.Entry.<Long, BigDecimal>comparingByValue().reversed())
                .limit(10)
                .forEach(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("clientId", e.getKey());
                    row.put("clientName", clientNames.getOrDefault(e.getKey(), "Client #" + e.getKey()));
                    row.put("totalRevenue", e.getValue());
                    rows.add(row);
                });

        // If invoices have no clientId, still show top customer names
        if (rows.isEmpty()) {
            revenueByCustomerName.entrySet().stream()
                    .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                    .limit(10)
                    .forEach(e -> {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("clientId", null);
                        row.put("clientName", e.getKey());
                        row.put("totalRevenue", e.getValue());
                        rows.add(row);
                    });
        }

        return rows;
    }
}

