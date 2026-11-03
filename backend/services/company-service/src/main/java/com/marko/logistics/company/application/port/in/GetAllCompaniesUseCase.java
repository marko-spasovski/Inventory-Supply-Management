package com.marko.logistics.company.application.port.in;

import com.marko.logistics.company.application.dto.CompanyResponse;

import java.util.List;

public interface GetAllCompaniesUseCase {
    List<CompanyResponse> getAllCompanies();
}
