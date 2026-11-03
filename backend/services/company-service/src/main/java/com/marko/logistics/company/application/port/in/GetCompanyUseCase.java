package com.marko.logistics.company.application.port.in;

import com.marko.logistics.company.application.dto.CompanyResponse;

import java.util.UUID;

public interface GetCompanyUseCase {
    CompanyResponse getCompanyById(UUID id);
}
