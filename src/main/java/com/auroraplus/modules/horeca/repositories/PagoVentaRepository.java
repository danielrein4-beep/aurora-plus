package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.PagoVenta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PagoVentaRepository extends JpaRepository<PagoVenta, Long> {
    List<PagoVenta> findByComandaIdOrderByFechaPagoAsc(Long comandaId);
}
