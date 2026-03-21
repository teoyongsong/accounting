package com.sgaccounting.backend.invoice;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceCostRepository extends JpaRepository<InvoiceCost, Long> {

    List<InvoiceCost> findByCostDateBetween(LocalDate start, LocalDate end);

    List<InvoiceCost> findByInvoice_Id(Long invoiceId);

    void deleteByInvoice_Id(Long invoiceId);
}

