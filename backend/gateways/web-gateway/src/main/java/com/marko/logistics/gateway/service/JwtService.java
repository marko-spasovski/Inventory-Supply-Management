package com.marko.logistics.gateway.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;

@Service
public class JwtService {
    private final String SECRET = "ewzqAN2z1bq7yYFcN3/KId4wbohavFXxHE7nnr82lZE=";

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
