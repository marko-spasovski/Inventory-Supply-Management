package com.marko.logistics.auth.application.port.in;

import com.marko.logistics.auth.application.dto.AuthResponse;
import com.marko.logistics.auth.application.dto.LoginRequest;

public interface LoginUseCase {
    AuthResponse login(LoginRequest request);
}
