package com.auroraplus.modules.minero.repositories;

import com.auroraplus.modules.minero.entities.TipoTrabajoMinero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TipoTrabajoMineroRepository extends JpaRepository<TipoTrabajoMinero, Long> {
}
