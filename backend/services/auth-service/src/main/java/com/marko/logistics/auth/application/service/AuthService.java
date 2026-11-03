package com.marko.logistics.auth.application.service;

import com.marko.logistics.auth.application.dto.AuthResponse;
import com.marko.logistics.auth.application.dto.LoginRequest;
import com.marko.logistics.auth.application.dto.RegisterRequest;
import com.marko.logistics.auth.application.mapper.AuthMapper;
import com.marko.logistics.auth.application.port.in.LoginUseCase;
import com.marko.logistics.auth.application.port.in.RegisterUseCase;
import com.marko.logistics.auth.application.port.out.UserRepositoryPort;
import com.marko.logistics.auth.domain.exception.InvalidCredentialsException;
import com.marko.logistics.auth.domain.exception.UserAlreadyExistsException;
import com.marko.logistics.auth.domain.exception.UserNotFoundException;
import com.marko.logistics.auth.domain.model.Role;
import com.marko.logistics.auth.domain.model.User;
import com.marko.logistics.auth.infrastructure.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class AuthService implements
        LoginUseCase,
        RegisterUseCase
{
    private final UserRepositoryPort repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepositoryPort repository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Override
    public AuthResponse login(LoginRequest request){
        log.info("Login attempt for email: {}", request.email());

        User user = repository.findByEmail(request.email())
                .orElseThrow(() -> {
                    log.warn("Login failed - user not found : {}", request.email());
                    return new UserNotFoundException(request.email());
                });

        if(!passwordEncoder.matches(request.password(), user.getPassword())) {
            log.info("Login failed - invalid password for: {}", request.email());
            throw new InvalidCredentialsException(request.email());
        }

        log.info("Login successful for: {}", request.email());
        return AuthMapper.toResponse(user);
    }

    @Override
    public AuthResponse register(RegisterRequest request){
        log.info("Register attempt for email: {}", request.email());

        if(repository.existsByEmail(request.email())){
            log.warn("Register failed - email already exists: {}", request.email());
            throw new UserAlreadyExistsException(request.email());
        }

        Role role = switch (request.role().toLowerCase()){
            case "manager" -> Role.MANAGER;
            case "worker"  -> Role.WORKER;
            case "admin"   -> Role.ADMIN;
            case "driver"  -> Role.DRIVER;
            default -> {
                log.warn("Register failed - invalid role: {}", request.role());
                yield Role.WORKER;
            }
        };

        User user = User.create(
                request.email(),
                request.name(),
                passwordEncoder.encode(request.password()),
                role
        );

        User saved = repository.save(user);
        log.info("User registered with ID: {}", saved.getId());

        return AuthMapper.toResponse(user);
    }

    public String generateToken(LoginRequest request){
        User user = repository.findByEmail(request.email())
                .orElseThrow(() -> new UserNotFoundException(request.email()));

        return jwtService.generateToken(user);
    }

    public String generateRefreshToken(LoginRequest request){
        User user = repository.findByEmail(request.email())
                .orElseThrow(() -> new UserNotFoundException(request.email()));

        return jwtService.generateRefreshToken(user);
    }

    /** Exchange a valid refresh token for a fresh access token. */
    public String refreshAccessToken(String refreshToken){
        String email = jwtService.validateRefreshAndExtractEmail(refreshToken);
        User user = repository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
        return jwtService.generateToken(user);
    }
}
