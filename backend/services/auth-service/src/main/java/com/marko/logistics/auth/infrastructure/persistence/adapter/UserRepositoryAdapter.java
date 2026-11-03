package com.marko.logistics.auth.infrastructure.persistence.adapter;

import com.marko.logistics.auth.application.mapper.AuthMapper;
import com.marko.logistics.auth.application.port.out.UserRepositoryPort;
import com.marko.logistics.auth.domain.model.User;
import com.marko.logistics.auth.infrastructure.persistence.repository.JpaUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepositoryPort {
    private final JpaUserRepository repository;



    @Override
    public User save(User user){
        var entity = AuthMapper.toEntity(user);
        var saved = repository.save(entity);
        return AuthMapper.toDomain(saved);
    }

    @Override
    public Optional<User> findByEmail(String email){
        return repository.findByEmail(email)
                .map(AuthMapper::toDomain);
    }

    @Override
    public boolean existsByEmail(String email){
        return repository.existsByEmail(email);
    }
}
