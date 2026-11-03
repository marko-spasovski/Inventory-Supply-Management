package com.marko.logistics.auth.infrastructure.persistence.adapter;

import com.marko.logistics.auth.domain.model.Role;
import com.marko.logistics.auth.domain.model.User;
import com.marko.logistics.auth.infrastructure.persistence.entity.UserJpaEntity;
import com.marko.logistics.auth.infrastructure.persistence.repository.JpaUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserRepositoryAdapterTest {

    private JpaUserRepository jpa;
    private UserRepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        jpa = mock(JpaUserRepository.class);
        adapter = new UserRepositoryAdapter(jpa);
    }

    @Test
    void save_persistsEntity_andReturnsDomainUser() {
        User user = User.create("a@x.com", "Alice", "pw", Role.MANAGER);
        when(jpa.save(any(UserJpaEntity.class))).thenAnswer(i -> i.getArgument(0));

        User saved = adapter.save(user);

        assertEquals(user.getId(), saved.getId());
        assertEquals("a@x.com", saved.getEmail());
        verify(jpa).save(any(UserJpaEntity.class));
    }

    @Test
    void findByEmail_returnsDomainUser_whenFound() {
        UUID id = UUID.randomUUID();
        UserJpaEntity entity = new UserJpaEntity(id, "a@x.com", "Alice", "pw", Role.WORKER);
        when(jpa.findByEmail("a@x.com")).thenReturn(Optional.of(entity));

        Optional<User> result = adapter.findByEmail("a@x.com");

        assertTrue(result.isPresent());
        assertEquals(id, result.get().getId());
        assertEquals(Role.WORKER, result.get().getRole());
    }

    @Test
    void findByEmail_returnsEmpty_whenNotFound() {
        when(jpa.findByEmail("missing@x.com")).thenReturn(Optional.empty());
        assertTrue(adapter.findByEmail("missing@x.com").isEmpty());
    }

    @Test
    void existsByEmail_delegatesToJpa() {
        when(jpa.existsByEmail("a@x.com")).thenReturn(true);
        assertTrue(adapter.existsByEmail("a@x.com"));

        when(jpa.existsByEmail("b@x.com")).thenReturn(false);
        assertFalse(adapter.existsByEmail("b@x.com"));
    }
}
