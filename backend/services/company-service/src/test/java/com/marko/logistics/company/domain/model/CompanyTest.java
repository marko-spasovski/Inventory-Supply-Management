package com.marko.logistics.company.domain.model;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class CompanyTest {

    @Test
    void create_assignsRandomId_andCopiesFields() {
        Company c = Company.create("Acme", "a@b.com", "555", "John");

        assertNotNull(c.getId());
        assertEquals("Acme", c.getName());
        assertEquals("a@b.com", c.getEmail());
        assertEquals("555", c.getPhone());
        assertEquals("John", c.getContact());
    }

    @Test
    void create_generatesUniqueIds() {
        Company a = Company.create("A", "a@a.com", "1", "X");
        Company b = Company.create("A", "a@a.com", "1", "X");
        assertNotEquals(a.getId(), b.getId());
    }

    @Test
    void update_overridesAllMutableFields() {
        Company c = Company.create("Old", "old@x.com", "111", "Joe");
        c.update("New", "new@x.com", "222", "Jane");

        assertEquals("New", c.getName());
        assertEquals("new@x.com", c.getEmail());
        assertEquals("222", c.getPhone());
        assertEquals("Jane", c.getContact());
    }

    @Test
    void setters_updateIndividualFields() {
        Company c = Company.create("A", "a@x.com", "1", "X");
        UUID newId = UUID.randomUUID();
        c.setId(newId);
        c.setName("B");
        c.setEmail("b@x.com");
        c.setPhone("2");
        c.setContact("Y");

        assertEquals(newId, c.getId());
        assertEquals("B", c.getName());
        assertEquals("b@x.com", c.getEmail());
        assertEquals("2", c.getPhone());
        assertEquals("Y", c.getContact());
    }
}
