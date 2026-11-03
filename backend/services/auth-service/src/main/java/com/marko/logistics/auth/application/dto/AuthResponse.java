package com.marko.logistics.auth.application.dto;

import java.util.UUID;

public record AuthResponse (
        UUID id,
        String email,
        String name,
        String role
){}
