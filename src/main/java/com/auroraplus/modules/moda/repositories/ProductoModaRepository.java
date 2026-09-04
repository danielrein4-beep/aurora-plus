package com.auroraplus.modules.moda.repositories;

import com.auroraplus.modules.moda.entities.ProductoModa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoModaRepository extends JpaRepository<ProductoModa, Long> {
    Optional<ProductoModa> findByCodigoSkuPadre(String codigoSkuPadre);
    List<ProductoModa> findAllByOrderByNombreAsc();
}
