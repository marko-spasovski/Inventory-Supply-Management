package com.marko.logistics.inventory.infrastructure.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class RequestContext {

    private static final String HEADER_EMAIL = "X-User-Email";
    private static final String HEADER_ROLE = "X-User-Role";
    private static final String HEADER_ID = "X-User-Id";

    public String getUserEmail(HttpServletRequest request){
        return requireHeader(request, HEADER_EMAIL);
    }

    public String getUserRole(HttpServletRequest request){
        return requireHeader(request, HEADER_ROLE);
    }

    public String getUserId(HttpServletRequest request) {
        return requireHeader(request, HEADER_ID);
    }

    public String requireHeader(HttpServletRequest request, String name){
        String value = request.getHeader(name);
        if(value == null || value.isBlank()) {
            throw new IllegalStateException("Missing internal header: " + name);
        }
        return value;
    }
}