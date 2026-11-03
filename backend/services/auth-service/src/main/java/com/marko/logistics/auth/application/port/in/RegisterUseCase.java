package com.marko.logistics.auth.application.port.in;

import com.marko.logistics.auth.application.dto.AuthResponse;
import com.marko.logistics.auth.application.dto.RegisterRequest;

public interface RegisterUseCase {
    AuthResponse register(RegisterRequest request);
}
