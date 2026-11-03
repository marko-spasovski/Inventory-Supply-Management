package com.marko.logistics.inventory.infrastructure.persistence;

import com.marko.logistics.inventory.domain.model.Inventory;
import com.marko.logistics.inventory.infrastructure.adapter.InventoryRepositoryAdapter;
import com.marko.logistics.inventory.infrastructure.repository.JpaInventoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ContextConfiguration(classes = InventoryAdapterRepositoryTest.TestConfig.class)
public class InventoryAdapterRepositoryTest {

    /**
     * Minimal Spring context: only JPA repositories + entity scanning.
     * This avoids loading gRPC beans, PostgreSQL datasource, or any other
     * infrastructure that @DataJpaTest would otherwise try to wire up
     * from the full InventoryServiceApplication context.
     * H2 in-memory database is auto-configured by @DataJpaTest.
     */
    @org.springframework.boot.test.context.TestConfiguration
    @EnableJpaRepositories(basePackages = "com.marko.logistics.inventory.infrastructure.repository")
    @EntityScan(basePackages = "com.marko.logistics.inventory.infrastructure.persistence.entity")
    static class TestConfig {}

    @Autowired
    private JpaInventoryRepository repository;

    private InventoryRepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new InventoryRepositoryAdapter(repository);
    }

    @Test
    void saveAndFindByProductIdAndWarehouseId() {
        Inventory inventory = Inventory.create("prod-1", "wh-1", 50);
        adapter.save(inventory);

        Optional<Inventory> found = adapter.findByProductIdAndWarehouseId("prod-1", "wh-1");

        assertTrue(found.isPresent());
        assertEquals("prod-1", found.get().getProductId());
        assertEquals("wh-1", found.get().getWarehouseId());
        assertEquals(50, found.get().getQuantity());
    }

    @Test
    void findAll_returnsAllSavedInventory() {
        adapter.save(Inventory.create("prod-1", "wh-1", 10));
        adapter.save(Inventory.create("prod-2", "wh-2", 20));

        List<Inventory> all = adapter.findAll();

        assertEquals(2, all.size());
    }

    @Test
    void findAllByWarehouseId_returnsOnlyMatchingEntries() {
        adapter.save(Inventory.create("prod-1", "wh-99", 5));
        adapter.save(Inventory.create("prod-2", "wh-99", 15));
        adapter.save(Inventory.create("prod-3", "wh-00", 99));

        List<Inventory> result = adapter.findAllByWarehouseId("wh-99");

        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(i -> i.getWarehouseId().equals("wh-99")));
    }

    @Test
    void save_updatesQuantity_whenCalledAgain() {
        Inventory inventory = Inventory.create("prod-X", "wh-X", 10);
        Inventory saved = adapter.save(inventory);

        saved.increase(5);
        adapter.save(saved);

        Optional<Inventory> found = adapter.findByProductIdAndWarehouseId("prod-X", "wh-X");
        assertTrue(found.isPresent());
        assertEquals(15, found.get().getQuantity());
    }

    @Test
    void findByProductIdAndWarehouseId_returnsEmpty_whenNotFound() {
        Optional<Inventory> found = adapter.findByProductIdAndWarehouseId("ghost-prod", "ghost-wh");
        assertTrue(found.isEmpty());
    }
}