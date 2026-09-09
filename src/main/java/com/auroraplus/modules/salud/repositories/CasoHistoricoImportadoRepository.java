package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.CasoHistoricoImportado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CasoHistoricoImportadoRepository extends JpaRepository<CasoHistoricoImportado, Long> {

    List<CasoHistoricoImportado> findByDiagnosticoCie10(String diagnosticoCie10);

    List<CasoHistoricoImportado> findByFuente(String fuente);

    void deleteByFuente(String fuente);

    interface DiagnosticoConteoImportado {
        String getCie10();
        Long getTotal();
    }

    /** Diagnósticos presentes en el historial importado (Excel) — para que el Canal Endémico
     * ofrezca un CIE-10 en el selector aunque el tenant todavía no tenga NINGUNA consulta real
     * registrada (caso típico: clínica nueva que solo cargó su historial de años anteriores). */
    @Query("SELECT c.diagnosticoCie10 AS cie10, SUM(c.casos) AS total FROM CasoHistoricoImportado c " +
           "GROUP BY c.diagnosticoCie10 ORDER BY SUM(c.casos) DESC")
    List<DiagnosticoConteoImportado> contarPorDiagnostico();
}
