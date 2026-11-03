package com.marko.logistics.company.application.port.in;

import com.marko.logistics.company.application.dto.TotalCompaniesResponse;

public interface GetTotalNumberOfCompanies {
    TotalCompaniesResponse countAllCompanies();
}
