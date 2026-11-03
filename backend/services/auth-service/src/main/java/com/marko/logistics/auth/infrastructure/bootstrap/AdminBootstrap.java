package com.marko.logistics.auth.infrastructure.bootstrap;

import com.marko.logistics.auth.application.port.out.UserRepositoryPort;
import com.marko.logistics.auth.domain.model.Role;
import com.marko.logistics.auth.domain.model.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the first ADMIN at start-up from AUTH_BOOTSTRAP_ADMIN_EMAIL / AUTH_BOOTSTRAP_ADMIN_PASSWORD,
 * because public registration can only create WORKER accounts (finding R01).
 * Does nothing when the variables are unset or the account already exists.
 */
@Slf4j
@Component
public class AdminBootstrap implements ApplicationRunner {

    private final UserRepositoryPort repository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepositoryPort repository, PasswordEncoder passwordEncoder,
                          @Value("${auth.bootstrap-admin.email:}") String email,
                          @Value("${auth.bootstrap-admin.password:}") String password) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.isBlank()) {
            log.info("No bootstrap admin configured");
            return;
        }
        if (password.length() < 8) {
            throw new IllegalStateException("AUTH_BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters");
        }
        if (repository.existsByEmail(email)) {
            log.info("Bootstrap admin already exists");
            return;
        }
        repository.save(User.create(email, "Administrator", passwordEncoder.encode(password), Role.ADMIN));
        log.info("Bootstrap admin created");
    }
}
