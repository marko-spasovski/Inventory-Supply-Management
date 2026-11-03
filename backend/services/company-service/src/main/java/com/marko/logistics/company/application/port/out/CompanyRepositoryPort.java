package com.marko.logistics.company.application.port.out;

import com.marko.logistics.company.domain.model.Company;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyRepositoryPort {
    Company save(Company company);
    List<Company> findAll();
    Optional<Company> findById(UUID id);
    void deleteById(UUID id);
}
