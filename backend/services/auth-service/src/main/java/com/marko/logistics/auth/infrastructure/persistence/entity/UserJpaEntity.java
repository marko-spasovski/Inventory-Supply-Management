package com.marko.logistics.auth.infrastructure.persistence.entity;

import com.marko.logistics.auth.domain.model.Role;
import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "users")
public class UserJpaEntity {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    protected UserJpaEntity() {}

    public UserJpaEntity(UUID id, String email, String name, String password, Role role){
        this.id = id;
        this.email = email;
        this.name = name;
        this.password = password;
        this.role = role;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getName() {
        return name;
    }

    public String getPassword() {
        return password;
    }

    public Role getRole() {
        return role;
    }
}
