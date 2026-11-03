package com.marko.logistics.gateway.util;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Predicate;

@Component
public class RouteValidator {

    // Paths anyone can hit without a token
    private static final List<String> OPEN_PATHS = List.of(
            "/auth/login",
            "/auth/register",
            "/auth/logout",
            "/auth/refresh",
            "/actuator/health"
    );

    // Paths requiring MANAGER role (gateway enforces this before forwarding)
//    private static final List<String> MANAGER_ONLY = List.of(
//    );

    public boolean isSecured(String path) {
        return OPEN_PATHS.stream().noneMatch(path::startsWith);
    }

//    public boolean requiresManager(String path) {
//        return MANAGER_ONLY.stream().anyMatch(path::startsWith);
//    }
}