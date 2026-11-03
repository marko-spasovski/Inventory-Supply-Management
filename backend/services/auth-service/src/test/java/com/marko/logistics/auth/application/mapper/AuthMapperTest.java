package com.marko.logistics.auth.application.mapper;

import com.marko.logistics.auth.application.dto.AuthResponse;
import com.marko.logistics.auth.domain.model.Role;
import com.marko.logistics.auth.domain.model.User;
import com.marko.logistics.auth.infrastructure.persistence.entity.UserJpaEntity;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class AuthMapperTest {

    @Test
    void toResponse_mapsUserFields() {
        UUID id = UUID.randomUUID();
        User u = new User(id, "a@b.com", "Alice", "pw", Role.MANAGER);

        AuthResponse r = AuthMapper.toResponse(u);

        assertEquals(id, r.id());
        assertEquals("a@b.com", r.email());
        assertEquals("Alice", r.name());
        assertEquals("MANAGER", r.role());
    }

    @Test
    void toEntity_mapsAllFields() {
        UUID id = UUID.randomUUID();
        User u = new User(id, "a@b.com", "Alice", "pw", Role.ADMIN);

        UserJpaEntity entity = AuthMapper.toEntity(u);

        assertEquals(id, entity.getId());
        assertEquals("a@b.com", entity.getEmail());
        assertEquals("Alice", entity.getName());
        assertEquals("pw", entity.getPassword());
        assertEquals(Role.ADMIN, entity.getRole());
    }

    @Test
    void toDomain_mapsAllFields() {
        UUID id = UUID.randomUUID();
        UserJpaEntity entity = new UserJpaEntity(id, "d@x.com", "Dave", "hash", Role.DRIVER);

        User u = AuthMapper.toDomain(entity);

        assertEquals(id, u.getId());
        assertEquals("d@x.com", u.getEmail());
        assertEquals("Dave", u.getName());
        assertEquals("hash", u.getPassword());
        assertEquals(Role.DRIVER, u.getRole());
    }

    @Test
    void roundTrip_preservesData() {
        User original = User.create("e@x.com", "Eve", "secret", Role.WORKER);
        User roundTripped = AuthMapper.toDomain(AuthMapper.toEntity(original));

        assertEquals(original.getId(), roundTripped.getId());
        assertEquals(original.getEmail(), roundTripped.getEmail());
        assertEquals(original.getName(), roundTripped.getName());
        assertEquals(original.getPassword(), roundTripped.getPassword());
        assertEquals(original.getRole(), roundTripped.getRole());
    }
}
