package com.marko.logistics.company.presentation.controller;

import com.marko.logistics.company.application.dto.CompanyResponse;
import com.marko.logistics.company.application.dto.CreateCompanyRequest;
import com.marko.logistics.company.application.dto.TotalCompaniesResponse;
import com.marko.logistics.company.application.dto.UpdateCompanyRequest;
import com.marko.logistics.company.application.service.CompanyService;
import com.marko.logistics.company.infrastructure.security.RequestContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;
    private final RequestContext requestContext;

    @PostMapping
    public CompanyResponse create(
            @RequestBody CreateCompanyRequest request
            ){
        return companyService.createCompany(request);
    }


    @GetMapping
    public List<CompanyResponse> getAll(){
        return companyService.getAllCompanies();
    }

    @GetMapping("/{id}")
    public CompanyResponse getById(
            @PathVariable UUID id
    ){
        return companyService.getCompanyById(id);
    }

    @GetMapping("/total")
    public TotalCompaniesResponse getTotalCompanies(){
        return companyService.countAllCompanies();
    }

    @PutMapping("/{id}")
    public CompanyResponse update(
            @PathVariable UUID id,
            @RequestBody UpdateCompanyRequest request){

        return companyService.updateCompany(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(
            @PathVariable UUID id
    ){
        companyService.deleteCompanyById(id);
    }

}
