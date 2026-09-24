package com.auroraplus.modules.pacientesapp.repositories;

import com.auroraplus.modules.pacientesapp.entities.PerfilConsultorio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PerfilConsultorioRepository extends JpaRepository<PerfilConsultorio, Long> {
    List<PerfilConsultorio> findByPublicadoTrue();
}
