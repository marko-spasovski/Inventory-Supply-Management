package com.marko.logistics.company.application.service;

import com.marko.logistics.company.application.dto.CompanyResponse;
import com.marko.logistics.company.application.dto.CreateCompanyRequest;
import com.marko.logistics.company.application.dto.TotalCompaniesResponse;
import com.marko.logistics.company.application.dto.UpdateCompanyRequest;
import com.marko.logistics.company.application.port.out.CompanyRepositoryPort;
import com.marko.logistics.company.domain.exception.CompanyNotFoundException;
import com.marko.logistics.company.domain.model.Company;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CompanyServiceTest {

    private CompanyRepositoryPort repository;
    private CompanyService service;

    @BeforeEach
    void setUp() {
        repository = mock(CompanyRepositoryPort.class);
        service = new CompanyService(repository);
    }

    @Test
    void createCompany_persistsAndReturnsResponse() {
        CreateCompanyRequest req = new CreateCompanyRequest("Acme", "a@x.com", "555", "John");
        when(repository.save(any(Company.class))).thenAnswer(i -> i.getArgument(0));

        CompanyResponse resp = service.createCompany(req);

        assertEquals("Acme", resp.name());
        assertEquals("a@x.com", resp.email());
        assertNotNull(resp.id());
        verify(repository, atLeastOnce()).save(any(Company.class));
    }

    @Test
    void getAllCompanies_mapsEachToResponse() {
        Company c1 = Company.create("A", "a@x.com", "1", "X");
        Company c2 = Company.create("B", "b@x.com", "2", "Y");
        when(repository.findAll()).thenReturn(List.of(c1, c2));

        List<CompanyResponse> list = service.getAllCompanies();

        assertEquals(2, list.size());
        assertEquals("A", list.get(0).name());
        assertEquals("B", list.get(1).name());
    }

    @Test
    void getAllCompanies_returnsEmpty_whenNone() {
        when(repository.findAll()).thenReturn(List.of());
        assertTrue(service.getAllCompanies().isEmpty());
    }

    @Test
    void getCompanyById_returnsResponse_whenFound() {
        UUID id = UUID.randomUUID();
        Company c = new Company(id, "Acme", "a@x.com", "555", "John");
        when(repository.findById(id)).thenReturn(Optional.of(c));

        CompanyResponse r = service.getCompanyById(id);

        assertEquals(id, r.id());
        assertEquals("Acme", r.name());
    }

    @Test
    void getCompanyById_throws_whenMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(CompanyNotFoundException.class, () -> service.getCompanyById(id));
    }

    @Test
    void updateCompany_modifiesAndSaves() {
        UUID id = UUID.randomUUID();
        Company existing = new Company(id, "Old", "o@x.com", "1", "Joe");
        when(repository.findById(id)).thenReturn(Optional.of(existing));
        when(repository.save(any(Company.class))).thenAnswer(i -> i.getArgument(0));

        UpdateCompanyRequest req = new UpdateCompanyRequest("New", "n@x.com", "2", "Jane");
        CompanyResponse r = service.updateCompany(id, req);

        assertEquals("New", r.name());
        assertEquals("n@x.com", r.email());
        assertEquals("2", r.phone());
        assertEquals("Jane", r.contact());
        verify(repository).save(existing);
    }

    @Test
    void updateCompany_throws_whenMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());
        UpdateCompanyRequest req = new UpdateCompanyRequest("N", "e@x.com", "1", "X");

        assertThrows(CompanyNotFoundException.class, () -> service.updateCompany(id, req));
        verify(repository, never()).save(any());
    }

    @Test
    void deleteCompanyById_deletes_whenFound() {
        UUID id = UUID.randomUUID();
        Company c = new Company(id, "X", "x@x.com", "1", "Y");
        when(repository.findById(id)).thenReturn(Optional.of(c));

        service.deleteCompanyById(id);

        verify(repository).deleteById(id);
    }

    @Test
    void deleteCompanyById_throws_whenMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(CompanyNotFoundException.class, () -> service.deleteCompanyById(id));
        verify(repository, never()).deleteById(any());
    }

    @Test
    void countAllCompanies_returnsTotal() {
        when(repository.findAll()).thenReturn(List.of(
                Company.create("A", "a@x.com", "1", "X"),
                Company.create("B", "b@x.com", "2", "Y"),
                Company.create("C", "c@x.com", "3", "Z")));

        TotalCompaniesResponse total = service.countAllCompanies();

        assertEquals(3, total.getTotalNumberOfCompanies());
    }

    @Test
    void countAllCompanies_returnsZero_whenEmpty() {
        when(repository.findAll()).thenReturn(List.of());
        assertEquals(0, service.countAllCompanies().getTotalNumberOfCompanies());
    }
}
