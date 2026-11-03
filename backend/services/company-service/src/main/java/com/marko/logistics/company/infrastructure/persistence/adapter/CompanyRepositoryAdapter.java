package com.marko.logistics.company.infrastructure.persistence.adapter;

import com.marko.logistics.company.application.dto.TotalCompaniesResponse;
import com.marko.logistics.company.application.mapper.CompanyMapper;
import com.marko.logistics.company.application.port.out.CompanyRepositoryPort;
import com.marko.logistics.company.domain.model.Company;
import com.marko.logistics.company.infrastructure.persistence.repository.JpaCompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
@Slf4j
public class CompanyRepositoryAdapter implements CompanyRepositoryPort {

    private final JpaCompanyRepository repository;

    @Override
    public Company save(Company company) {
        log.debug("Saving company: {}", company.getName());
        var entity = CompanyMapper.toJpaEntity(company);
        var saved = repository.save(entity);
        log.debug("Company saved with ID: {}", saved.getId());
        return com.marko.logistics.company.application.mapper.CompanyMapper.toDomain(saved);
    }

    @Override
    public Optional<Company> findById(UUID id) {
        log.debug("Finding company by ID: {}", id);
        return repository.findById(id)
                .map(entity -> {
                    log.debug("Company found: {}", entity.getName());
                    return com.marko.logistics.company.application.mapper.CompanyMapper.toDomain(entity);
                });
    }

    @Override
    public List<Company> findAll() {
        log.debug("Fetching all companies");
        var companies = repository.findAll()
                .stream()
                .map(com.marko.logistics.company.application.mapper.CompanyMapper::toDomain)
                .collect(Collectors.toList());
        log.debug("Fetched {} companies", companies.size());
        return companies;
    }

    @Override
    public void deleteById(UUID id) {
        log.debug("Deleting company ID: {}", id);
        repository.deleteById(id);
        log.debug("Company ID {} deleted", id);
    }
}