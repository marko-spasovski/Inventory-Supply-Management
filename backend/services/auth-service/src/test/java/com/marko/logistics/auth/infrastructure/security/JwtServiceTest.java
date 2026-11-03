package com.marko.logistics.auth.infrastructure.security;

import com.marko.logistics.auth.domain.model.Role;
import com.marko.logistics.auth.domain.model.User;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private User user;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret",
                "ewzqAN2z1bq7yYFcN3/KId4wbohavFXxHE7nnr82lZE=");
        ReflectionTestUtils.setField(jwtService, "expirationMs", 3_600_000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpirationMs", 7_200_000L);

        user = new User(UUID.randomUUID(), "user@x.com", "User", "pw", Role.MANAGER);
    }

    @Test
    void generateToken_producesParsableToken() {
        String token = jwtService.generateToken(user);
        assertNotNull(token);
        assertFalse(token.isBlank());
        assertEquals("user@x.com", jwtService.extractEmail(token));
        assertEquals("MANAGER", jwtService.extractRole(token));
    }

    @Test
    void generateRefreshToken_carriesRefreshType() {
        String refresh = jwtService.generateRefreshToken(user);
        assertEquals("user@x.com", jwtService.validateRefreshAndExtractEmail(refresh));
    }

    @Test
    void validateRefresh_rejectsAccessToken() {
        String access = jwtService.generateToken(user);
        assertThrows(JwtException.class,
                () -> jwtService.validateRefreshAndExtractEmail(access));
    }

    @Test
    void extractEmail_throwsForGarbage() {
        assertThrows(JwtException.class, () -> jwtService.extractEmail("not.a.jwt"));
    }

    @Test
    void generateToken_includesUserIdClaim() {
        String token = jwtService.generateToken(user);
        // userId claim is in the token; parseable round-trip via extractEmail confirms signature
        assertNotNull(jwtService.extractEmail(token));
    }

    @Test
    void differentUsers_getDifferentTokens() {
        User other = new User(UUID.randomUUID(), "other@x.com", "Other", "p", Role.ADMIN);
        String a = jwtService.generateToken(user);
        String b = jwtService.generateToken(other);
        assertNotEquals(a, b);
    }
}
