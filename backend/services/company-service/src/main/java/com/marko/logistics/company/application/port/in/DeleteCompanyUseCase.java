package com.marko.logistics.company.application.port.in;

import java.util.UUID;

public interface DeleteCompanyUseCase {
    void deleteCompanyById(UUID id);
}
