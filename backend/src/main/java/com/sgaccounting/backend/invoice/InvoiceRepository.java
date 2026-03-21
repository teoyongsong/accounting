package com.sgaccounting.backend.invoice;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByIssueDateBetween(LocalDate start, LocalDate end);
}

