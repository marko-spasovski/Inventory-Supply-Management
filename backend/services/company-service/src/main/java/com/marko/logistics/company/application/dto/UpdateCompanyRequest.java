package com.marko.logistics.company.application.dto;

import jakarta.validation.constraints.Email;

public record UpdateCompanyRequest(
        String name,
        String email,
        String phone,
        String contact
) {}
