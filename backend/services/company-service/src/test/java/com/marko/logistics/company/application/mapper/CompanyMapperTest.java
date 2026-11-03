package com.marko.logistics.company.application.mapper;

import com.marko.logistics.company.application.dto.CompanyResponse;
import com.marko.logistics.company.domain.model.Company;
import com.marko.logistics.company.infrastructure.persistence.entity.CompanyJpaEntity;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class CompanyMapperTest {

    @Test
    void toResponse_mapsAllFields() {
        UUID id = UUID.randomUUID();
        Company c = new Company(id, "Acme", "a@b.com", "555", "John");

        CompanyResponse r = CompanyMapper.toResponse(c);

        assertEquals(id, r.id());
        assertEquals("Acme", r.name());
        assertEquals("a@b.com", r.email());
        assertEquals("555", r.phone());
        assertEquals("John", r.contact());
    }

    @Test
    void toJpaEntity_mapsAllFields() {
        UUID id = UUID.randomUUID();
        Company c = new Company(id, "Acme", "a@b.com", "555", "John");

        CompanyJpaEntity e = CompanyMapper.toJpaEntity(c);

        assertEquals(id, e.getId());
        assertEquals("Acme", e.getName());
        assertEquals("a@b.com", e.getEmail());
        assertEquals("555", e.getPhone());
        assertEquals("John", e.getContact());
    }

    @Test
    void toDomain_roundTrip_preservesAllFields() {
        Company original = Company.create("X", "x@x.com", "1", "Y");
        Company back = CompanyMapper.toDomain(CompanyMapper.toJpaEntity(original));

        assertEquals(original.getId(), back.getId());
        assertEquals(original.getName(), back.getName());
        assertEquals(original.getEmail(), back.getEmail());
        assertEquals(original.getPhone(), back.getPhone());
        assertEquals(original.getContact(), back.getContact());
    }
}
