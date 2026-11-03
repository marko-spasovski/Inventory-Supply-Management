package com.marko.logistics.auth.domain.model;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UserTest {

    @Test
    void create_assignsRandomId_andCopiesFields() {
        User u = User.create("a@b.com", "Alice", "pw", Role.MANAGER);

        assertNotNull(u.getId());
        assertEquals("a@b.com", u.getEmail());
        assertEquals("Alice", u.getName());
        assertEquals("pw", u.getPassword());
        assertEquals(Role.MANAGER, u.getRole());
    }

    @Test
    void create_generatesUniqueIds() {
        User u1 = User.create("a@b.com", "A", "p", Role.WORKER);
        User u2 = User.create("a@b.com", "A", "p", Role.WORKER);
        assertNotEquals(u1.getId(), u2.getId());
    }

    @Test
    void changeEmail_updatesEmail() {
        User u = User.create("old@x.com", "n", "p", Role.WORKER);
        u.changeEmail("new@x.com");
        assertEquals("new@x.com", u.getEmail());
    }

    @Test
    void changePassword_updatesPassword() {
        User u = User.create("e@x.com", "n", "old", Role.WORKER);
        u.changePassword("new");
        assertEquals("new", u.getPassword());
    }

    @Test
    void changeRole_updatesRole() {
        User u = User.create("e@x.com", "n", "p", Role.WORKER);
        u.changeRole(Role.ADMIN);
        assertEquals(Role.ADMIN, u.getRole());
    }

    @Test
    void changeName_updatesName() {
        User u = User.create("e@x.com", "old", "p", Role.WORKER);
        u.changeName("new");
        assertEquals("new", u.getName());
    }

    @Test
    void constructor_preservesGivenId() {
        UUID id = UUID.randomUUID();
        User u = new User(id, "e@x.com", "n", "p", Role.DRIVER);
        assertEquals(id, u.getId());
    }
}
