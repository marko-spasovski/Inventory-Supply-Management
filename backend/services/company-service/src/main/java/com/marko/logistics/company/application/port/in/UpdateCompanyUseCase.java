package com.marko.logistics.company.application.port.in;

import com.marko.logistics.company.application.dto.CompanyResponse;
import com.marko.logistics.company.application.dto.UpdateCompanyRequest;

import java.util.UUID;

public interface UpdateCompanyUseCase {
    CompanyResponse updateCompany(UUID id, UpdateCompanyRequest request);
}
