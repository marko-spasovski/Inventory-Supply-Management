package com.marko.logistics.company.domain.model;

import java.util.UUID;


public class Company {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String contact;

    public Company(UUID id, String name, String email, String phone, String contact){
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.contact = contact;
    }

    public static Company create(String name, String email, String phone, String contact){

        return new Company(
                UUID.randomUUID(),
                name,
                email,
                phone,
                contact
        );
    }

    public void update(String name, String email, String phone, String contact){
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
