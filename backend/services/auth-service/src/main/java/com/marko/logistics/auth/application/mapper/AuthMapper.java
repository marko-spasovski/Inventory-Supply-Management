package com.marko.logistics.auth.application.mapper;

import com.marko.logistics.auth.application.dto.AuthResponse;
import com.marko.logistics.auth.domain.model.User;
import com.marko.logistics.auth.infrastructure.persistence.entity.UserJpaEntity;

public class AuthMapper {
    public static AuthResponse toResponse(User user){
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().toString()
        );
    }

    public static UserJpaEntity toEntity(User user){
        return new UserJpaEntity(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getPassword(),
                user.getRole()
        );
    }

    public static User toDomain(UserJpaEntity entity){
        return new User(
                entity.getId(),
                entity.getEmail(),
                entity.getName(),
                entity.getPassword(),
                entity.getRole()
        );
    }
}
