package com.marko.logistics.company.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateCompanyRequest(
   String name,
   String email,
   String phone,
   String contact
) {}
