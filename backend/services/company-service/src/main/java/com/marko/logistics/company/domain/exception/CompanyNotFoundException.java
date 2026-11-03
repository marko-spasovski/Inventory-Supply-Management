package com.marko.logistics.company.domain.exception;

import java.util.UUID;

public class CompanyNotFoundException extends RuntimeException {
    public CompanyNotFoundException(UUID companyId) {
        super("Company with id " + companyId + " not found.");
    }
}
