package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.Paciente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PacienteRepository extends JpaRepository<Paciente, Long> {

    Optional<Paciente> findByIdentificacion(String identificacion);

    List<Paciente> findByActivoTrue();

    @Query("SELECT p FROM Paciente p WHERE LOWER(p.nombres) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.apellidos) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.identificacion) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Paciente> buscarPorFiltro(@Param("query") String query);
}
