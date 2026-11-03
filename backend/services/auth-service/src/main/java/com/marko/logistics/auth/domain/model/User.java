package com.marko.logistics.auth.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;


public class User {

    @Id
    private UUID id;
    private String email;
    private String password;
    private String name;
    private Role role;

    protected User() {}

    public User(UUID id, String email, String name, String password, Role role){
        this.id = id;
        this.email = email;
        this.name = name;
        this.password = password;
        this.role = role;
    }

    public static User create(String email, String name, String password, Role role){
        return new User(
                UUID.randomUUID(),
                email,
                name,
                password,
                role
        );
    }

    public void changeEmail(String newEmail) {
        this.email = newEmail;
    }
    public void changePassword(String newPassword) {
        this.password = newPassword;
    }
    public void changeRole(Role newRole) {
        this.role = newRole;
    }
    public void changeName(String newName) { this.name = newName; }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public String getPassword() { return password; }
    public Role getRole() { return role; }

}
