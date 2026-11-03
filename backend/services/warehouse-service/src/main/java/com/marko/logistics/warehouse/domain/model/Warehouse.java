package com.marko.logistics.warehouse.domain.model;

import com.marko.logistics.warehouse.domain.enums.City;
import com.marko.logistics.warehouse.domain.enums.Country;

import java.util.UUID;


public class Warehouse {
    private UUID id;
    private String name;
    private Country country;
    private City city;
    private Integer totalCapacity;
    private Integer usedCapacity;

    public Warehouse(UUID id, String name, Country country, City city, Integer totalCapacity, Integer usedCapacity) {
        this.id = id;
        this.name = name;
        this.country = country;
        this.city = city;
        this.totalCapacity = totalCapacity;
        this.usedCapacity = usedCapacity;
    }


    public static Warehouse create(String name, Country country, City city, Integer totalCapacity) {
        return new Warehouse(
                UUID.randomUUID(),
                name,
                country,
                city,
                totalCapacity,
                0
        );
    }

    public void update(String name, Country country, City city, Integer totalCapacity, Integer usedCapacity) {
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

    public Integer getUsedCapacity() {
        return usedCapacity;
    }
}
