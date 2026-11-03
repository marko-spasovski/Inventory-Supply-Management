package com.marko.logistics.company.application.port.in;

import com.marko.logistics.company.application.dto.CompanyResponse;
import com.marko.logistics.company.application.dto.CreateCompanyRequest;

public interface CreateCompanyUseCase {
    CompanyResponse createCompany(CreateCompanyRequest request);
}
