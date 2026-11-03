package com.marko.logistics.company.application.dto;

import java.util.UUID;

public record CompanyResponse(
        UUID id,
        String name,
        String email,
        String phone,
        String contact
) {}
