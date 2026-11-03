package com.marko.logistics.warehouse.application.dto;

public class TotalWarehousesResponse {
    public final int totalNumberOfWarehouses;

    public TotalWarehousesResponse(int totalNumberOfWarehouses){
        this.totalNumberOfWarehouses = totalNumberOfWarehouses;
    }

    public int getTotalNumberOfWarehouses(){
        return this.totalNumberOfWarehouses;
    }
}
