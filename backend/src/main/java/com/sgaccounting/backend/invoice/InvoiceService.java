package com.sgaccounting.backend.invoice;

import com.sgaccounting.backend.client.Client;
import com.sgaccounting.backend.client.ClientRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceService {

    private final InvoiceRepository repository;
    private final InvoiceLineRepository lineRepository;
    private final ClientRepository clientRepository;

    public InvoiceService(
            InvoiceRepository repository,
            InvoiceLineRepository lineRepository,
            ClientRepository clientRepository) {
        this.repository = repository;
        this.lineRepository = lineRepository;
        this.clientRepository = clientRepository;
    }

    public List<Invoice> findAll() {
        return repository.findAll();
    }

    public Invoice findById(Long id) {
        return repository.findById(id).orElseThrow();
    }

    @Transactional
    public Invoice create(Invoice invoice) {
        if (invoice.getIssueDate() == null) {
            invoice.setIssueDate(LocalDate.now());
        }
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().isBlank()) {
            invoice.setInvoiceNumber(generateNumber(invoice.getIssueDate()));
        }
        if (invoice.getStatus() == null || invoice.getStatus().isBlank()) {
            invoice.setStatus("DRAFT");
        }
        attachClientAndCopyDetails(invoice);
        return repository.save(invoice);
    }

    @Transactional
    public Invoice update(Long id, Invoice updated) {
        Invoice existing = findById(id);
        existing.setCustomerName(updated.getCustomerName());
        existing.setCustomerEmail(updated.getCustomerEmail());
        existing.setIssueDate(updated.getIssueDate());
        existing.setDueDate(updated.getDueDate());
        existing.setCurrency(updated.getCurrency());
        existing.setStatus(updated.getStatus());
        if (updated.getClient() != null && updated.getClient().getId() != null) {
            Client client = clientRepository.findById(updated.getClient().getId()).orElseThrow();
            existing.setClient(client);
            existing.setCustomerName(client.getName());
            existing.setCustomerEmail(client.getEmail());
        }
        if (updated.getLines() != null) {
            existing.getLines().clear();
            BigDecimal total = BigDecimal.ZERO;
            int lineNum = 1;
            for (InvoiceLine incoming : updated.getLines()) {
                InvoiceLine line = new InvoiceLine();
                line.setInvoice(existing);
                line.setLineNumber(lineNum++);
                line.setDescription(incoming.getDescription());
                line.setQuantity(incoming.getQuantity() != null ? incoming.getQuantity() : BigDecimal.ZERO);
                line.setUnitPrice(incoming.getUnitPrice() != null ? incoming.getUnitPrice() : BigDecimal.ZERO);
                BigDecimal lineTotal = line.getQuantity().multiply(line.getUnitPrice());
                line.setLineTotal(lineTotal);
                total = total.add(lineTotal);
                existing.getLines().add(line);
            }
            existing.setAmount(total);
        }
        return repository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Transactional
    public void recalcInvoiceAmount(Long invoiceId) {
        Invoice inv = findById(invoiceId);
        BigDecimal total = lineRepository.findByInvoice_Id(invoiceId).stream()
            .map(InvoiceLine::getLineTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        inv.setAmount(total);
        repository.save(inv);
    }

    private void attachClientAndCopyDetails(Invoice invoice) {
        if (invoice.getClient() != null && invoice.getClient().getId() != null) {
            Client client = clientRepository.findById(invoice.getClient().getId()).orElseThrow();
            invoice.setClient(client);
            if (invoice.getCustomerName() == null || invoice.getCustomerName().isBlank()) {
                invoice.setCustomerName(client.getName());
            }
            if (invoice.getCustomerEmail() == null || invoice.getCustomerEmail().isBlank()) {
                invoice.setCustomerEmail(client.getEmail());
            }
        }
    }

    private String generateNumber(LocalDate date) {
        String prefix = "INV-" + date.format(DateTimeFormatter.BASIC_ISO_DATE);
        long countToday = repository.count();
        return prefix + "-" + String.format("%04d", countToday + 1);
    }
}

