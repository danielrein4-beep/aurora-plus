package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.PresentacionRepuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PresentacionRepuestoRepository extends JpaRepository<PresentacionRepuesto, Long> {

    List<PresentacionRepuesto> findByRepuestoIdAndTenantId(Long repuestoId, Long tenantId);
}
