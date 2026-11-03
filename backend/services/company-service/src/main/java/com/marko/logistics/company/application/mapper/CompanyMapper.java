package com.marko.logistics.company.application.mapper;

import com.marko.logistics.company.application.dto.CompanyResponse;
import com.marko.logistics.company.domain.model.Company;
import com.marko.logistics.company.infrastructure.persistence.entity.CompanyJpaEntity;

public class CompanyMapper {

    public static CompanyResponse toResponse(Company company){

        return new CompanyResponse(
                company.getId(),
                company.getName(),
                company.getEmail(),
                company.getPhone(),
                company.getContact()
        );
    }

    public static CompanyJpaEntity toJpaEntity(Company company) {
        return new CompanyJpaEntity(
                company.getId(),
                company.getName(),
                company.getEmail(),
                company.getPhone(),
                company.getContact()
        );
    }

    public static Company toDomain(CompanyJpaEntity entity){
        return new Company(
                entity.getId(),
                entity.getName(),
                entity.getEmail(),
                entity.getPhone(),
                entity.getContact()
        );
    }
}
