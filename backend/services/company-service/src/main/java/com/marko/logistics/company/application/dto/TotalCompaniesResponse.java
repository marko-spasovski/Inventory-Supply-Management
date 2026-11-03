package com.marko.logistics.company.application.dto;

public class TotalCompaniesResponse {
    private final int totalNumberOfCompanies;

    public TotalCompaniesResponse(int totalNumberOfCompanies){
        this.totalNumberOfCompanies = totalNumberOfCompanies;
    }

    public int getTotalNumberOfCompanies(){
        return totalNumberOfCompanies;
    }
}
