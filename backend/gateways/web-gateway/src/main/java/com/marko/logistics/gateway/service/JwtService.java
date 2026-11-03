package com.marko.logistics.gateway.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;

@Service
public class JwtService {
    // Same signing secret as auth-service, injected from JWT_SECRET (finding R03: it used to be a
    // hard-coded constant, so rotating the deployment secret silently broke web logins).
    private final String SECRET;

    public JwtService(@Value("${jwt.secret}") String secret) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be set (at least 32 characters)");
        }
        this.SECRET = secret;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
    }

    public Claims validateToken(String token){
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractEmail(String token){
        return validateToken(token).getSubject();
    }

    public String extractRole(String token){
        return validateToken(token).get("role", String.class);
    }
}
