package com.marko.logistics.warehouse.infrastructure.persistence.entity;

import com.marko.logistics.warehouse.domain.enums.City;
import com.marko.logistics.warehouse.domain.enums.Country;
import jakarta.persistence.*;


import java.util.UUID;

@Entity
@Table(name = "warehouses")
public class WarehouseJpaEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Country country;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private City city;

    @Column(nullable = false)
    private Integer totalCapacity;


    @Column(nullable = false)
    private Integer usedCapacity; // currently used

    protected WarehouseJpaEntity() {}

    public WarehouseJpaEntity(UUID id, String name, Country country, City city, Integer totalCapacity, Integer usedCapacity){
        this.id = id;
        this.name = name;
        this.country = country;
        this.city = city;
        this.totalCapacity = totalCapacity;
        this.usedCapacity = usedCapacity;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Country getCountry() {
        return country;
    }

    public City getCity() {
        return city;
    }

    public Integer getTotalCapacity() {
        return totalCapacity;
    }
    public Integer getUsedCapacity() { return usedCapacity; }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setCountry(Country country) {
        this.country = country;
    }

    public void setCity(City city) {
        this.city = city;
    }

    public void setTotalCapacity(Integer totalCapacity) {
        this.totalCapacity = totalCapacity;
    }
    public void setUsedCapacity(Integer usedCapacity) { this.usedCapacity = usedCapacity; }
}
