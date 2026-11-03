package com.marko.logistics.company.infrastructure.persistence.repository;

import com.marko.logistics.company.domain.model.Company;
import com.marko.logistics.company.infrastructure.persistence.entity.CompanyJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface JpaCompanyRepository extends JpaRepository<CompanyJpaEntity, UUID> {
}
