package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.Comanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComandaRepository extends JpaRepository<Comanda, Long> {
}
