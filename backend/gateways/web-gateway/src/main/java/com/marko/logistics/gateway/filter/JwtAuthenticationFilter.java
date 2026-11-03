package com.marko.logistics.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marko.logistics.gateway.service.JwtService;
import com.marko.logistics.gateway.util.RouteValidator;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE)
public class JwtAuthenticationFilter implements GlobalFilter {

    private final JwtService jwtService;
    private final RouteValidator routeValidator;
    private final ObjectMapper objectMapper;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        if (!routeValidator.isSecured(path)) {
            return chain.filter(exchange);
        }

        String token = extractToken(exchange);
        if (token == null) {
            return unauthorized(exchange, "Missing or invalid token");
        }

        try {
            Claims claims = jwtService.validateToken(token);

//            // ✅ Add it here — token is valid, claims are available
//            String role = claims.get("role", String.class);
//            if (routeValidator.requiresManager(path) && !"MANAGER".equalsIgnoreCase(role)) {
//                return forbidden(exchange, "Insufficient permissions");
//            }


            // Strip the cookie, inject safe internal headers
            ServerWebExchange mutated = exchange.mutate()
                    .request(req -> req
                            .headers(headers -> {
                                headers.remove(HttpHeaders.COOKIE);           // never forward cookies downstream
                                headers.remove(HttpHeaders.AUTHORIZATION);    // never forward raw JWT downstream
                                headers.set("X-User-Id",    claims.get("userId", String.class));
                                headers.set("X-User-Email", claims.getSubject());
                                headers.set("X-User-Role",  claims.get("role", String.class));
                            })
                    )
                    .build();

            return chain.filter(mutated);

        } catch (ExpiredJwtException e) {
            return unauthorized(exchange, "Token expired");
        } catch (JwtException e) {
            return unauthorized(exchange, "Invalid token");
        }
    }

    private String extractToken(ServerWebExchange exchange) {
        // 1. HttpOnly cookie (set by auth service on login)
        HttpCookie cookie = exchange.getRequest().getCookies().getFirst("AUTH_TOKEN");
        if (cookie != null && StringUtils.hasText(cookie.getValue())) {
            return cookie.getValue();
        }
        // 2. Bearer header (for machine-to-machine / API clients)
        String header = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "status", 401,
                "error", "Unauthorized",
                "message", message,
                "path", exchange.getRequest().getURI().getPath()
        );

        try {
            byte[] bytes = objectMapper.writeValueAsBytes(body);
            DataBuffer buffer = response.bufferFactory().wrap(bytes);
            return response.writeWith(Mono.just(buffer));
        } catch (Exception e) {
            return response.setComplete();
        }
    }

    private Mono<Void> forbidden(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "status", 403,
                "error", "Forbidden",
                "message", message,
                "path", exchange.getRequest().getURI().getPath()
        );

        try {
            byte[] bytes = objectMapper.writeValueAsBytes(body);
            DataBuffer buffer = response.bufferFactory().wrap(bytes);
            return response.writeWith(Mono.just(buffer));
        } catch (Exception e) {
            return response.setComplete();
        }
    }
}