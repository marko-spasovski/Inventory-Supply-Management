package com.marko.logistics.auth.application.port.out;

import com.marko.logistics.auth.domain.model.User;

import java.util.Optional;

public interface UserRepositoryPort {
    User save(User user);
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
