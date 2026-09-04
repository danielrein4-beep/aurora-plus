package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.ItemComanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ItemComandaRepository extends JpaRepository<ItemComanda, Long> {

    List<ItemComanda> findByEstacionCocinaAndEstadoItemNot(String estacionCocina, ItemComanda.EstadoItem estadoItem);

    List<ItemComanda> findByComandaId(Long comandaId);
}
