package com.marko.logistics.company.application.service;

import com.marko.logistics.company.application.dto.CompanyResponse;
import com.marko.logistics.company.application.dto.CreateCompanyRequest;
import com.marko.logistics.company.application.dto.TotalCompaniesResponse;
import com.marko.logistics.company.application.dto.UpdateCompanyRequest;
import com.marko.logistics.company.application.mapper.CompanyMapper;
import com.marko.logistics.company.application.port.in.*;
import com.marko.logistics.company.application.port.out.CompanyRepositoryPort;
import com.marko.logistics.company.domain.exception.CompanyNotFoundException;
import com.marko.logistics.company.domain.model.Company;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyService implements
        CreateCompanyUseCase,
        DeleteCompanyUseCase,
        GetAllCompaniesUseCase,
        GetCompanyUseCase,
        UpdateCompanyUseCase,
        GetTotalNumberOfCompanies{

    private final CompanyRepositoryPort repository;

    @Override
    public TotalCompaniesResponse countAllCompanies(){
        var allCompanies = repository.findAll();

        return new TotalCompaniesResponse(allCompanies.size());
    }

    @Override
    public CompanyResponse createCompany(CreateCompanyRequest request){
        log.info("Creating company: {}", request.name());
        Company company = Company.create(
                request.name(),
                request.email(),
                request.phone(),
                request.contact()
        );

        var saved = repository.save(company);
        log.info("Company created with ID: {}", saved.getId());

        return CompanyMapper.toResponse(repository.save(company));
    }

    @Override
    public List<CompanyResponse> getAllCompanies(){
        log.info("Fetching all companies");
        var companies = repository.findAll();
        log.info("Fetched {} companies", companies.size());

        return companies
                .stream()
                .map(CompanyMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CompanyResponse getCompanyById(UUID id){
        log.info("Fetching company by ID: {}", id);
        var company = repository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Company not found for ID: {}", id);
                    return new CompanyNotFoundException(id);
                });

        log.info("Company found: {}", company.getName());

        return CompanyMapper.toResponse(company);
    }

    @Override
    public CompanyResponse updateCompany(UUID id, UpdateCompanyRequest request){
        log.info("Updating company ID: {}", id);
        var company = repository.findById(id)
                .orElseThrow(() -> {
                   log.warn("Company not found for ID: {}", id);
                   return new CompanyNotFoundException(id);
                });

        company.update(
                request.name(),
                request.email(),
                request.phone(),
                request.contact()
        );

        var updated = repository.save(company);
        log.info("Company ID {} updated successfully", id);

        return CompanyMapper.toResponse(company);
    }

    @Override
    public void deleteCompanyById(UUID id){
        log.info("Deleting company ID: {}", id);
        var company = repository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Company not found for ID: {}", id);
                    return new CompanyNotFoundException(id);
                });

        repository.deleteById(id);
        log.info("Company ID {} deleted", id);
    }
}
