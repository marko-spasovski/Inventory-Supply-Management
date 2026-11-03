package com.marko.logistics.warehouse.application.mapper;

import com.marko.logistics.warehouse.application.dto.WarehouseResponse;
import com.marko.logistics.warehouse.domain.enums.City;
import com.marko.logistics.warehouse.domain.enums.Country;
import com.marko.logistics.warehouse.domain.model.Warehouse;
import com.marko.logistics.warehouse.infrastructure.persistence.entity.WarehouseJpaEntity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class WarehouseMapperTest {

    @Test
    void toResponse_mapsAllFields() {
        Warehouse w = Warehouse.create("Main", Country.SLOVENIA, City.LJUBLJANA, 1000);
        WarehouseResponse r = WarehouseMapper.toResponse(w);

        assertEquals(w.getId(), r.id());
        assertEquals("Main", r.name());
        assertEquals(Country.SLOVENIA, r.country());
        assertEquals(City.LJUBLJANA, r.city());
        assertEquals(1000, r.totalCapacity());
        assertEquals(0, r.usedCapacity());
    }

    @Test
    void toJpaEntity_mapsAllFields() {
        Warehouse w = Warehouse.create("X", Country.SLOVENIA, City.LJUBLJANA, 50);
        WarehouseJpaEntity entity = WarehouseMapper.toJpaEntity(w);

        assertEquals(w.getId(), entity.getId());
        assertEquals("X", entity.getName());
        assertEquals(50, entity.getTotalCapacity());
    }

    @Test
    void roundTrip_preservesAllFields() {
        Warehouse original = Warehouse.create("Y", Country.SLOVENIA, City.MARIBOR, 200);
        Warehouse back = WarehouseMapper.toDomain(WarehouseMapper.toJpaEntity(original));

        assertEquals(original.getId(), back.getId());
        assertEquals(original.getName(), back.getName());
        assertEquals(original.getCountry(), back.getCountry());
        assertEquals(original.getCity(), back.getCity());
        assertEquals(original.getTotalCapacity(), back.getTotalCapacity());
        assertEquals(original.getUsedCapacity(), back.getUsedCapacity());
    }
}
