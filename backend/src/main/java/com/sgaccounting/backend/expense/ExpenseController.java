package com.sgaccounting.backend.expense;

import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class ExpenseController {

    private final ExpenseRepository repo;

    public ExpenseController(ExpenseRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Expense> list(
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to) {
        if (from != null && to != null) {
            LocalDate start = LocalDate.parse(from);
            LocalDate end = LocalDate.parse(to);
            return repo.findByDateBetween(start, end);
        }
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public Expense get(@PathVariable("id") Long id) {
        return repo.findById(id).orElseThrow();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Expense create(@RequestBody Expense e) {
        return repo.save(e);
    }

    @PutMapping("/{id}")
    public Expense update(@PathVariable("id") Long id, @RequestBody Expense e) {
        Expense existing = repo.findById(id).orElseThrow();
        existing.setDate(e.getDate());
        existing.setDescription(e.getDescription());
        existing.setCategory(e.getCategory());
        existing.setAmount(e.getAmount());
        return repo.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") Long id) {
        repo.deleteById(id);
    }
}

