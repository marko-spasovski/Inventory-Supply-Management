package com.marko.logistics.company.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;

import java.util.UUID;

@Entity
@Table(name = "companies")
public class CompanyJpaEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    @Email
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String contact;

    protected CompanyJpaEntity() {}

    public CompanyJpaEntity(UUID id, String name, String email, String phone, String contact){
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.contact = contact;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getContact() {
        return contact;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setContact(String contact) {
        this.contact = contact;
    }
}
