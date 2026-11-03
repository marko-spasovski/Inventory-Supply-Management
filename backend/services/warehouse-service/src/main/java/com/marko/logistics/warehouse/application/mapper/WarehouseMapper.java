package com.marko.logistics.warehouse.application.mapper;

import com.marko.logistics.warehouse.application.dto.WarehouseResponse;
import com.marko.logistics.warehouse.domain.model.Warehouse;
import com.marko.logistics.warehouse.infrastructure.persistence.entity.WarehouseJpaEntity;

public class WarehouseMapper {

    public static WarehouseJpaEntity toJpaEntity(Warehouse warehouse){
        return new WarehouseJpaEntity(
                warehouse.getId(),
                warehouse.getName(),
                warehouse.getCountry(),
                warehouse.getCity(),
                warehouse.getTotalCapacity(),
                warehouse.getUsedCapacity()
        );
    }

    public static Warehouse toDomain(WarehouseJpaEntity entity){
        return new Warehouse(
                entity.getId(),
                entity.getName(),
                entity.getCountry(),
                entity.getCity(),
                entity.getTotalCapacity(),
                entity.getUsedCapacity()
        );
    }

    public static WarehouseResponse toResponse(Warehouse warehouse){
        return new WarehouseResponse(
                warehouse.getId(),
                warehouse.getName(),
                warehouse.getCountry(),
                warehouse.getCity(),
                warehouse.getTotalCapacity(),
                warehouse.getUsedCapacity()
        );
    }
}
