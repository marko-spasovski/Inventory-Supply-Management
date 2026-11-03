package com.marko.logistics.warehouse.infrastructure.persistence;

import com.marko.logistics.warehouse.domain.enums.City;
import com.marko.logistics.warehouse.domain.enums.Country;
import com.marko.logistics.warehouse.domain.model.Warehouse;
import com.marko.logistics.warehouse.infrastructure.persistence.adapter.WarehouseRepositoryAdapter;
import com.marko.logistics.warehouse.infrastructure.persistence.repository.JpaWarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
public class WarehouseAdapterRepositoryTest {

    @Autowired
    private JpaWarehouseRepository repository;  // Spring injects the repository

    private WarehouseRepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new WarehouseRepositoryAdapter(repository); // create adapter manually
    }

    @Test
    void saveAndFindById() {
        Warehouse warehouse = Warehouse.create("Test Warehouse", Country.MACEDONIA, City.KUMANOVO, 100);
        Warehouse saved = adapter.save(warehouse);
        Optional<Warehouse> found = adapter.findById(saved.getId());

        assertTrue(found.isPresent(), "Warehouse should be found");
        assertEquals("Test Warehouse", found.get().getName());
        assertEquals(City.KUMANOVO, found.get().getCity());
        assertEquals(Country.MACEDONIA, found.get().getCountry());
        assertEquals(100, found.get().getTotalCapacity());
    }

    @Test
    void deleteWarehouse() {
        Warehouse warehouse = Warehouse.create("DeleteMe", Country.SLOVENIA, City.MARIBOR, 50);
        Warehouse saved = adapter.save(warehouse);

        adapter.deleteById(saved.getId());

        Optional<Warehouse> found = adapter.findById(saved.getId());
        assertTrue(found.isEmpty(), "Warehouse should be deleted");
    }
}