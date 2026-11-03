package com.marko.logistics.auth.domain.repository;

import com.marko.logistics.auth.domain.model.User;

import java.util.Optional;

public interface UserRepository {
    Optional<User> findByEmail(String email);
    User save(User user);
}
