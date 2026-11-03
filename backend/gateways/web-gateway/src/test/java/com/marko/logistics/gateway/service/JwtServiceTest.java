package com.marko.logistics.gateway.service;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String SECRET = "test-only-signing-secret-not-used-anywhere-else";

    private static String token(String secret) {
        return Jwts.builder()
                .subject("a@x.com").claim("role", "MANAGER")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    @Test
    void acceptsTokenSignedWithTheInjectedSecret() {
        assertEquals("MANAGER", new JwtService(SECRET).validateToken(token(SECRET)).get("role", String.class));
    }

    @Test
    void rejectsTokenSignedWithAnotherSecret() {
        // R03: the old hard-coded key must not be accepted once a different secret is configured.
        String other = token("another-secret-that-is-long-enough-for-hs256-x");
        assertThrows(JwtException.class, () -> new JwtService(SECRET).validateToken(other));
    }

    @Test
    void refusesToStartWithoutASecret() {
        assertThrows(IllegalStateException.class, () -> new JwtService(""));
        assertThrows(IllegalStateException.class, () -> new JwtService("too-short"));
    }
}
