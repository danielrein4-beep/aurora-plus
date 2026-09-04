package com.auroraplus.modules.moda.repositories;

import com.auroraplus.modules.moda.entities.VarianteModa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface VarianteModaRepository extends JpaRepository<VarianteModa, Long> {
    Optional<VarianteModa> findByCodigoBarras(String codigoBarras);
    List<VarianteModa> findByProductoId(Long productoId);
}
