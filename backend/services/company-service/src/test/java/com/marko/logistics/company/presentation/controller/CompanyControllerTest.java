package com.marko.logistics.company.presentation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marko.logistics.company.application.dto.CompanyResponse;
import com.marko.logistics.company.application.dto.CreateCompanyRequest;
import com.marko.logistics.company.application.dto.TotalCompaniesResponse;
import com.marko.logistics.company.application.dto.UpdateCompanyRequest;
import com.marko.logistics.company.application.service.CompanyService;
import com.marko.logistics.company.infrastructure.security.RequestContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CompanyControllerTest {

    private MockMvc mockMvc;
    private CompanyService service;
    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        service = mock(CompanyService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new CompanyController(service, mock(RequestContext.class)))
                .build();
        mapper = new ObjectMapper();
    }

    @Test
    void create_returnsCreatedCompany() throws Exception {
        UUID id = UUID.randomUUID();
        CompanyResponse resp = new CompanyResponse(id, "Acme", "a@x.com", "555", "John");
        when(service.createCompany(any(CreateCompanyRequest.class))).thenReturn(resp);

        mockMvc.perform(post("/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(
                                new CreateCompanyRequest("Acme", "a@x.com", "555", "John"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Acme"));
    }

    @Test
    void getAll_returnsList() throws Exception {
        when(service.getAllCompanies()).thenReturn(List.of(
                new CompanyResponse(UUID.randomUUID(), "A", "a@x.com", "1", "X"),
                new CompanyResponse(UUID.randomUUID(), "B", "b@x.com", "2", "Y")));

        mockMvc.perform(get("/companies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("A"))
                .andExpect(jsonPath("$[1].name").value("B"));
    }

    @Test
    void getById_returnsCompany() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.getCompanyById(id)).thenReturn(
                new CompanyResponse(id, "Acme", "a@x.com", "555", "John"));

        mockMvc.perform(get("/companies/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void getTotal_returnsCount() throws Exception {
        when(service.countAllCompanies()).thenReturn(new TotalCompaniesResponse(7));

        mockMvc.perform(get("/companies/total"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalNumberOfCompanies").value(7));
    }

    @Test
    void update_returnsUpdated() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.updateCompany(eq(id), any(UpdateCompanyRequest.class)))
                .thenReturn(new CompanyResponse(id, "New", "n@x.com", "2", "Jane"));

        mockMvc.perform(put("/companies/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(
                                new UpdateCompanyRequest("New", "n@x.com", "2", "Jane"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New"));
    }

    @Test
    void delete_returns200_andCallsService() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(delete("/companies/" + id))
                .andExpect(status().isOk());

        verify(service).deleteCompanyById(id);
    }
}
