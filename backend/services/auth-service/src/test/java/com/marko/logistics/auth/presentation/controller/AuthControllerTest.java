package com.marko.logistics.auth.presentation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marko.logistics.auth.application.dto.AuthResponse;
import com.marko.logistics.auth.application.dto.LoginRequest;
import com.marko.logistics.auth.application.dto.RegisterRequest;
import com.marko.logistics.auth.application.port.in.LoginUseCase;
import com.marko.logistics.auth.application.port.in.RegisterUseCase;
import com.marko.logistics.auth.application.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthControllerTest {

    private MockMvc mockMvc;
    private LoginUseCase loginUseCase;
    private RegisterUseCase registerUseCase;
    private AuthService authService;
    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        loginUseCase = mock(LoginUseCase.class);
        registerUseCase = mock(RegisterUseCase.class);
        authService = mock(AuthService.class);
        AuthController controller = new AuthController(loginUseCase, registerUseCase, authService);
        ReflectionTestUtils.setField(controller, "secureCookie", false);
        ReflectionTestUtils.setField(controller, "sameSite", "Lax");
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        mapper = new ObjectMapper();
    }

    // ---------- /auth/login ----------

    @Test
    void login_setsCookieAndHeaders_andReturnsUser() throws Exception {
        AuthResponse resp = new AuthResponse(UUID.randomUUID(), "u@x.com", "U", "WORKER");
        when(loginUseCase.login(any(LoginRequest.class))).thenReturn(resp);
        when(authService.generateToken(any(LoginRequest.class))).thenReturn("acc.jwt");
        when(authService.generateRefreshToken(any(LoginRequest.class))).thenReturn("ref.jwt");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new LoginRequest("u@x.com", "pw"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("u@x.com"))
                .andExpect(jsonPath("$.role").value("WORKER"))
                .andExpect(header().string("X-Auth-Token", "acc.jwt"))
                .andExpect(header().string("X-Refresh-Token", "ref.jwt"))
                .andExpect(header().exists("Set-Cookie"));
    }

    // ---------- /auth/register ----------

    @Test
    void register_returns201_andUser() throws Exception {
        AuthResponse resp = new AuthResponse(UUID.randomUUID(), "n@x.com", "New", "MANAGER");
        when(registerUseCase.register(any(RegisterRequest.class))).thenReturn(resp);

        RegisterRequest req = new RegisterRequest("New", "n@x.com", "secret", "manager");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("n@x.com"))
                .andExpect(jsonPath("$.role").value("MANAGER"));
    }

    // ---------- /auth/refresh ----------

    @Test
    void refresh_returns200_andNewAccessToken() throws Exception {
        when(authService.refreshAccessToken("good.rt")).thenReturn("new.access");

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("refreshToken", "good.rt"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new.access"));
    }

    @Test
    void refresh_returns400_whenBodyMissingToken() throws Exception {
        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    void refresh_returns400_whenTokenBlank() throws Exception {
        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("refreshToken", ""))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refresh_returns401_whenServiceThrows() throws Exception {
        when(authService.refreshAccessToken("bad")).thenThrow(new RuntimeException("invalid"));

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("refreshToken", "bad"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    // ---------- /auth/logout ----------

    @Test
    void logout_returns204_andClearsCookie() throws Exception {
        mockMvc.perform(post("/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(header().exists("Set-Cookie"));
    }
}
