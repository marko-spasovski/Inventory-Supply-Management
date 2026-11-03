package com.marko.logistics.auth.application.service;

import com.marko.logistics.auth.application.dto.AuthResponse;
import com.marko.logistics.auth.application.dto.LoginRequest;
import com.marko.logistics.auth.application.dto.RegisterRequest;
import com.marko.logistics.auth.application.port.out.UserRepositoryPort;
import com.marko.logistics.auth.domain.exception.InvalidCredentialsException;
import com.marko.logistics.auth.domain.exception.UserAlreadyExistsException;
import com.marko.logistics.auth.domain.exception.UserNotFoundException;
import com.marko.logistics.auth.domain.model.Role;
import com.marko.logistics.auth.domain.model.User;
import com.marko.logistics.auth.infrastructure.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private UserRepositoryPort repository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private AuthService service;

    @BeforeEach
    void setUp() {
        repository = mock(UserRepositoryPort.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtService = mock(JwtService.class);
        service = new AuthService(repository, passwordEncoder, jwtService);
    }

    private User sampleUser() {
        return new User(UUID.randomUUID(), "user@x.com", "User", "hashed", Role.WORKER);
    }

    // ---------- login ----------

    @Test
    void login_returnsAuthResponse_whenCredentialsValid() {
        User user = sampleUser();
        LoginRequest req = new LoginRequest("user@x.com", "plain");

        when(repository.findByEmail("user@x.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("plain", "hashed")).thenReturn(true);

        AuthResponse resp = service.login(req);

        assertEquals(user.getId(), resp.id());
        assertEquals("user@x.com", resp.email());
        assertEquals("WORKER", resp.role());
    }

    @Test
    void login_throwsUserNotFound_whenEmailUnknown() {
        when(repository.findByEmail("nope@x.com")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class,
                () -> service.login(new LoginRequest("nope@x.com", "pw")));
    }

    @Test
    void login_throwsInvalidCredentials_whenPasswordWrong() {
        User user = sampleUser();
        when(repository.findByEmail("user@x.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class,
                () -> service.login(new LoginRequest("user@x.com", "wrong")));
    }

    // ---------- register ----------

    @Test
    void register_savesUser_whenEmailIsNew() {
        RegisterRequest req = new RegisterRequest("Alice", "a@x.com", "secret", "manager");
        when(repository.existsByEmail("a@x.com")).thenReturn(false);
        when(passwordEncoder.encode("secret")).thenReturn("encoded");
        when(repository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        AuthResponse resp = service.register(req);

        assertEquals("a@x.com", resp.email());
        assertEquals("Alice", resp.name());
        assertEquals("MANAGER", resp.role());
        verify(repository).save(argThat(u ->
                u.getEmail().equals("a@x.com")
                        && u.getPassword().equals("encoded")
                        && u.getRole() == Role.MANAGER));
    }

    @Test
    void register_throws_whenEmailAlreadyExists() {
        RegisterRequest req = new RegisterRequest("X", "dup@x.com", "secret", "worker");
        when(repository.existsByEmail("dup@x.com")).thenReturn(true);

        assertThrows(UserAlreadyExistsException.class, () -> service.register(req));
        verify(repository, never()).save(any());
    }

    @Test
    void register_mapsWorkerRole() {
        RegisterRequest req = new RegisterRequest("W", "w@x.com", "secret", "worker");
        when(repository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("h");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.register(req);
        verify(repository).save(argThat(u -> u.getRole() == Role.WORKER));
    }

    @Test
    void register_mapsAdminRole_caseInsensitive() {
        RegisterRequest req = new RegisterRequest("A", "a@x.com", "secret", "ADMIN");
        when(repository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("h");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.register(req);
        verify(repository).save(argThat(u -> u.getRole() == Role.ADMIN));
    }

    @Test
    void register_mapsDriverRole() {
        RegisterRequest req = new RegisterRequest("D", "d@x.com", "secret", "driver");
        when(repository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("h");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.register(req);
        verify(repository).save(argThat(u -> u.getRole() == Role.DRIVER));
    }

    @Test
    void register_unknownRole_defaultsToWorker() {
        RegisterRequest req = new RegisterRequest("X", "x@x.com", "secret", "wizard");
        when(repository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("h");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.register(req);
        verify(repository).save(argThat(u -> u.getRole() == Role.WORKER));
    }

    // ---------- token generation ----------

    @Test
    void generateToken_delegatesToJwtService() {
        User user = sampleUser();
        when(repository.findByEmail("user@x.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("access.jwt");

        String token = service.generateToken(new LoginRequest("user@x.com", "p"));

        assertEquals("access.jwt", token);
    }

    @Test
    void generateToken_throws_whenUserMissing() {
        when(repository.findByEmail("missing@x.com")).thenReturn(Optional.empty());
        assertThrows(UserNotFoundException.class,
                () -> service.generateToken(new LoginRequest("missing@x.com", "p")));
    }

    @Test
    void generateRefreshToken_delegatesToJwtService() {
        User user = sampleUser();
        when(repository.findByEmail("user@x.com")).thenReturn(Optional.of(user));
        when(jwtService.generateRefreshToken(user)).thenReturn("refresh.jwt");

        String token = service.generateRefreshToken(new LoginRequest("user@x.com", "p"));

        assertEquals("refresh.jwt", token);
    }

    // ---------- refresh ----------

    @Test
    void refreshAccessToken_returnsNewAccess_whenRefreshValid() {
        User user = sampleUser();
        when(jwtService.validateRefreshAndExtractEmail("rt")).thenReturn("user@x.com");
        when(repository.findByEmail("user@x.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("new.access");

        String result = service.refreshAccessToken("rt");

        assertEquals("new.access", result);
    }

    @Test
    void refreshAccessToken_throws_whenUserMissing() {
        when(jwtService.validateRefreshAndExtractEmail("rt")).thenReturn("gone@x.com");
        when(repository.findByEmail("gone@x.com")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> service.refreshAccessToken("rt"));
    }
}
