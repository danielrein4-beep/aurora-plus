package com.auroraplus.modules.salud.laboratorio.repositories;

import com.auroraplus.modules.salud.laboratorio.entities.ResultadoLaboratorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResultadoLaboratorioRepository extends JpaRepository<ResultadoLaboratorio, Long> {
    Optional<ResultadoLaboratorio> findByOrdenId(Long ordenId);
}
