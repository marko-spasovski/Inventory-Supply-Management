package com.marko.logistics.inventory.domain.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InventoryTest {

    @Test
    void create_assignsRandomId_andCopiesFields() {
        Inventory i = Inventory.create("prod-1", "wh-1", 5);

        assertNotNull(i.getId());
        assertEquals("prod-1", i.getProductId());
        assertEquals("wh-1", i.getWarehouseId());
        assertEquals(5, i.getQuantity());
        assertNull(i.getMinQuantity());
        assertNull(i.getMaxQuantity());
    }

    @Test
    void create_withThresholds() {
        Inventory i = Inventory.create("prod-1", "wh-1", 5, 10, 100);
        assertEquals(10, i.getMinQuantity());
        assertEquals(100, i.getMaxQuantity());
    }

    @Test
    void increase_addsToQuantity() {
        Inventory i = Inventory.create("p", "w", 5);
        i.increase(10);
        assertEquals(15, i.getQuantity());
    }

    @Test
    void increase_throwsForZeroOrNegative() {
        Inventory i = Inventory.create("p", "w", 5);
        assertThrows(IllegalArgumentException.class, () -> i.increase(0));
        assertThrows(IllegalArgumentException.class, () -> i.increase(-1));
    }

    @Test
    void reduce_subtractsFromQuantity() {
        Inventory i = Inventory.create("p", "w", 20);
        i.reduce(5);
        assertEquals(15, i.getQuantity());
    }

    @Test
    void reduce_throwsWhenInsufficient() {
        Inventory i = Inventory.create("p", "w", 5);
        assertThrows(IllegalArgumentException.class, () -> i.reduce(10));
    }

    @Test
    void reduce_throwsForZeroOrNegative() {
        Inventory i = Inventory.create("p", "w", 10);
        assertThrows(IllegalArgumentException.class, () -> i.reduce(0));
        assertThrows(IllegalArgumentException.class, () -> i.reduce(-3));
    }

    @Test
    void setThresholds_updatesNonNullOnly() {
        Inventory i = Inventory.create("p", "w", 5, 10, 100);
        i.setThresholds(20, null);
        assertEquals(20, i.getMinQuantity());
        assertEquals(100, i.getMaxQuantity());
    }

    @Test
    void isLowStock_trueWhenBelowMin() {
        Inventory i = Inventory.create("p", "w", 5, 10, null);
        assertTrue(i.isLowStock());
    }

    @Test
    void isLowStock_falseAtOrAboveMin() {
        Inventory i = Inventory.create("p", "w", 10, 10, null);
        assertFalse(i.isLowStock());
    }

    @Test
    void isLowStock_falseWhenMinUnset() {
        Inventory i = Inventory.create("p", "w", 1);
        assertFalse(i.isLowStock());
    }
}
