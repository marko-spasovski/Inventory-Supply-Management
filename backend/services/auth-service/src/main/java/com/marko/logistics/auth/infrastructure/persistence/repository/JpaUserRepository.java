package com.marko.logistics.auth.infrastructure.persistence.repository;

import com.marko.logistics.auth.domain.model.User;
import com.marko.logistics.auth.domain.repository.UserRepository;
import com.marko.logistics.auth.infrastructure.persistence.entity.UserJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface JpaUserRepository extends JpaRepository<UserJpaEntity, UUID> {
    Optional<UserJpaEntity> findByEmail(String email);
    boolean existsByEmail(String email);
}
