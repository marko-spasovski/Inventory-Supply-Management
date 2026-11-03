package com.marko.logistics.company.infrastructure.persistence.adapter;

import com.marko.logistics.company.domain.model.Company;
import com.marko.logistics.company.infrastructure.persistence.entity.CompanyJpaEntity;
import com.marko.logistics.company.infrastructure.persistence.repository.JpaCompanyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CompanyRepositoryAdapterTest {

    private JpaCompanyRepository jpa;
    private CompanyRepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        jpa = mock(JpaCompanyRepository.class);
        adapter = new CompanyRepositoryAdapter(jpa);
    }

    @Test
    void save_returnsMappedDomain() {
        Company c = Company.create("Acme", "a@x.com", "555", "John");
        when(jpa.save(any(CompanyJpaEntity.class))).thenAnswer(i -> i.getArgument(0));

        Company saved = adapter.save(c);

        assertEquals(c.getId(), saved.getId());
        assertEquals("Acme", saved.getName());
        verify(jpa).save(any(CompanyJpaEntity.class));
    }

    @Test
    void findById_returnsDomain_whenFound() {
        UUID id = UUID.randomUUID();
        CompanyJpaEntity entity = new CompanyJpaEntity(id, "Acme", "a@x.com", "555", "John");
        when(jpa.findById(id)).thenReturn(Optional.of(entity));

        Optional<Company> result = adapter.findById(id);

        assertTrue(result.isPresent());
        assertEquals("Acme", result.get().getName());
    }

    @Test
    void findById_returnsEmpty_whenMissing() {
        UUID id = UUID.randomUUID();
        when(jpa.findById(id)).thenReturn(Optional.empty());
        assertTrue(adapter.findById(id).isEmpty());
    }

    @Test
    void findAll_mapsAllEntities() {
        when(jpa.findAll()).thenReturn(List.of(
                new CompanyJpaEntity(UUID.randomUUID(), "A", "a@x.com", "1", "X"),
                new CompanyJpaEntity(UUID.randomUUID(), "B", "b@x.com", "2", "Y")));

        List<Company> all = adapter.findAll();
        assertEquals(2, all.size());
        assertEquals("A", all.get(0).getName());
    }

    @Test
    void deleteById_delegates() {
        UUID id = UUID.randomUUID();
        adapter.deleteById(id);
        verify(jpa).deleteById(id);
    }
}
