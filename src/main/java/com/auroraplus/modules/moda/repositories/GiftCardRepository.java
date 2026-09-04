package com.auroraplus.modules.moda.repositories;

import com.auroraplus.modules.moda.entities.GiftCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface GiftCardRepository extends JpaRepository<GiftCard, Long> {
    Optional<GiftCard> findByCodigo(String codigo);
}
