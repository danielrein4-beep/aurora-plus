package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.Mesa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MesaRepository extends JpaRepository<Mesa, Long> {
}
