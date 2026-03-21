package com.sgaccounting.backend.invoice;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class InvoiceController {

    private final InvoiceService service;
    private final InvoiceLineRepository lineRepository;
    private final InvoiceCostRepository costRepository;

    public InvoiceController(InvoiceService service, InvoiceLineRepository lineRepository,
            InvoiceCostRepository costRepository) {
        this.service = service;
        this.lineRepository = lineRepository;
        this.costRepository = costRepository;
    }

    @GetMapping
    public List<Invoice> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Invoice get(@PathVariable("id") Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Invoice create(@RequestBody Invoice invoice) {
        return service.create(invoice);
    }

    @PutMapping("/{id}")
    public Invoice update(@PathVariable("id") Long id, @RequestBody Invoice invoice) {
        return service.update(id, invoice);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") Long id) {
        service.delete(id);
    }

    // --- Invoice lines CRUD ---
    @GetMapping("/{id}/lines")
    public List<InvoiceLineDto> getLines(@PathVariable("id") Long id) {
        Invoice invoice = service.findById(id);
        return lineRepository.findByInvoice_Id(invoice.getId()).stream()
            .map(InvoiceLineDto::from)
            .toList();
    }

    @PostMapping("/{id}/lines")
    @Transactional
    public InvoiceLineDto addLine(@PathVariable("id") Long id, @RequestBody InvoiceLineRequest body) {
        Invoice invoice = service.findById(id);
        List<InvoiceLine> existing = lineRepository.findByInvoice_Id(invoice.getId());
        int nextNum = existing.isEmpty() ? 1 : existing.stream().mapToInt(InvoiceLine::getLineNumber).max().orElse(0) + 1;
        InvoiceLine line = new InvoiceLine();
        line.setInvoice(invoice);
        line.setLineNumber(nextNum);
        line.setDescription(body.getDescription());
        line.setQuantity(body.getQuantity() != null ? body.getQuantity() : BigDecimal.ZERO);
        line.setUnitPrice(body.getUnitPrice() != null ? body.getUnitPrice() : BigDecimal.ZERO);
        BigDecimal lineTotal = line.getQuantity().multiply(line.getUnitPrice());
        line.setLineTotal(lineTotal);
        line = lineRepository.save(line);
        recalcInvoiceAmount(invoice.getId());
        return InvoiceLineDto.from(line);
    }

    @PutMapping("/{id}/lines/{lineId}")
    @Transactional
    public InvoiceLineDto updateLine(@PathVariable("id") Long id, @PathVariable("lineId") Long lineId,
            @RequestBody InvoiceLineRequest body) {
        Invoice invoice = service.findById(id);
        InvoiceLine line = lineRepository.findById(lineId).orElseThrow();
        if (!line.getInvoice().getId().equals(invoice.getId())) {
            throw new IllegalArgumentException("Line does not belong to this invoice");
        }
        line.setDescription(body.getDescription());
        line.setQuantity(body.getQuantity() != null ? body.getQuantity() : BigDecimal.ZERO);
        line.setUnitPrice(body.getUnitPrice() != null ? body.getUnitPrice() : BigDecimal.ZERO);
        line.setLineTotal(line.getQuantity().multiply(line.getUnitPrice()));
        line = lineRepository.save(line);
        recalcInvoiceAmount(invoice.getId());
        return InvoiceLineDto.from(line);
    }

    @DeleteMapping("/{id}/lines/{lineId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteLine(@PathVariable("id") Long id, @PathVariable("lineId") Long lineId) {
        Invoice invoice = service.findById(id);
        InvoiceLine line = lineRepository.findById(lineId).orElseThrow();
        if (!line.getInvoice().getId().equals(invoice.getId())) {
            throw new IllegalArgumentException("Line does not belong to this invoice");
        }
        lineRepository.delete(line);
        recalcInvoiceAmount(invoice.getId());
    }

    private void recalcInvoiceAmount(Long invoiceId) {
        service.recalcInvoiceAmount(invoiceId);
    }

    // --- Invoice costs CRUD ---
    @GetMapping("/{id}/costs")
    public List<InvoiceCostDto> getCosts(@PathVariable("id") Long id) {
        Invoice invoice = service.findById(id);
        return costRepository.findByInvoice_Id(invoice.getId()).stream()
            .map(InvoiceCostDto::from)
            .toList();
    }

    @PostMapping("/{id}/costs")
    @Transactional
    public InvoiceCostDto addCost(@PathVariable("id") Long id, @RequestBody InvoiceCostRequest body) {
        Invoice invoice = service.findById(id);
        InvoiceCost cost = new InvoiceCost();
        cost.setInvoice(invoice);
        cost.setCostDate(body.getCostDate());
        cost.setDescription(body.getDescription());
        cost.setCategory(body.getCategory());
        cost.setAmount(body.getAmount());
        cost = costRepository.save(cost);
        return InvoiceCostDto.from(cost);
    }

    @PutMapping("/{id}/costs")
    @Transactional
    public List<InvoiceCostDto> replaceCosts(@PathVariable("id") Long id, @RequestBody List<InvoiceCostRequest> body) {
        Invoice invoice = service.findById(id);
        costRepository.deleteByInvoice_Id(invoice.getId());
        if (body != null && !body.isEmpty()) {
            for (InvoiceCostRequest req : body) {
                InvoiceCost cost = new InvoiceCost();
                cost.setInvoice(invoice);
                cost.setCostDate(req.getCostDate());
                cost.setDescription(req.getDescription());
                cost.setCategory(req.getCategory());
                cost.setAmount(req.getAmount());
                costRepository.save(cost);
            }
        }
        return costRepository.findByInvoice_Id(invoice.getId()).stream()
            .map(InvoiceCostDto::from)
            .toList();
    }

    @PutMapping("/{id}/costs/{costId}")
    @Transactional
    public InvoiceCostDto updateCost(@PathVariable("id") Long id, @PathVariable("costId") Long costId,
            @RequestBody InvoiceCostRequest body) {
        Invoice invoice = service.findById(id);
        InvoiceCost cost = costRepository.findById(costId).orElseThrow();
        if (!cost.getInvoice().getId().equals(invoice.getId())) {
            throw new IllegalArgumentException("Cost does not belong to this invoice");
        }
        cost.setCostDate(body.getCostDate());
        cost.setDescription(body.getDescription());
        cost.setCategory(body.getCategory());
        cost.setAmount(body.getAmount());
        cost = costRepository.save(cost);
        return InvoiceCostDto.from(cost);
    }

    @DeleteMapping("/{id}/costs/{costId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteCost(@PathVariable("id") Long id, @PathVariable("costId") Long costId) {
        Invoice invoice = service.findById(id);
        InvoiceCost cost = costRepository.findById(costId).orElseThrow();
        if (!cost.getInvoice().getId().equals(invoice.getId())) {
            throw new IllegalArgumentException("Cost does not belong to this invoice");
        }
        costRepository.delete(cost);
    }
}

