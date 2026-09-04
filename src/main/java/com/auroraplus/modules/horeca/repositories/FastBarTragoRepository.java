package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.FastBarTrago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FastBarTragoRepository extends JpaRepository<FastBarTrago, Long> {
}
