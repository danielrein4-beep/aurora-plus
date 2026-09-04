package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.DetalleReceta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DetalleRecetaRepository extends JpaRepository<DetalleReceta, Long> {

    List<DetalleReceta> findByEscandalloId(Long escandalloId);
}
