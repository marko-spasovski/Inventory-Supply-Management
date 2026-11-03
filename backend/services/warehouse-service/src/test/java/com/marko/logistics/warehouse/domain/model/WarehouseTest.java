package com.marko.logistics.warehouse.domain.model;

import com.marko.logistics.warehouse.domain.enums.City;
import com.marko.logistics.warehouse.domain.enums.Country;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class WarehouseTest {

    @Test
    void create_initializesWithUsedCapacityZero_andRandomId() {
        Warehouse w = Warehouse.create("Main", Country.SLOVENIA, City.LJUBLJANA, 1000);

        assertNotNull(w.getId());
        assertEquals("Main", w.getName());
        assertEquals(Country.SLOVENIA, w.getCountry());
        assertEquals(City.LJUBLJANA, w.getCity());
        assertEquals(1000, w.getTotalCapacity());
        assertEquals(0, w.getUsedCapacity());
    }

    @Test
    void create_generatesUniqueIds() {
        Warehouse a = Warehouse.create("W", Country.SLOVENIA, City.LJUBLJANA, 10);
        Warehouse b = Warehouse.create("W", Country.SLOVENIA, City.LJUBLJANA, 10);
        assertNotEquals(a.getId(), b.getId());
    }

    @Test
    void update_overridesAllFields() {
        Warehouse w = Warehouse.create("Old", Country.SLOVENIA, City.LJUBLJANA, 100);
        w.update("New", Country.MACEDONIA, City.SKOPJE, 200, 50);

        assertEquals("New", w.getName());
        assertEquals(Country.MACEDONIA, w.getCountry());
        assertEquals(City.SKOPJE, w.getCity());
        assertEquals(200, w.getTotalCapacity());
        assertEquals(50, w.getUsedCapacity());
    }

    @Test
    void constructor_preservesGivenId() {
        UUID id = UUID.randomUUID();
        Warehouse w = new Warehouse(id, "W", Country.SLOVENIA, City.LJUBLJANA, 50, 10);
        assertEquals(id, w.getId());
        assertEquals(10, w.getUsedCapacity());
    }
}
