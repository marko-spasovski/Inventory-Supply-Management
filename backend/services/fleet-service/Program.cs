using fleet_service.Application.Ports.In;
using fleet_service.Application.Ports.Out;
using fleet_service.Application.Services;
using fleet_service.Infrastructure.Persistence;
using fleet_service.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

namespace fleet_service;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        
        // ── CORS ──────────────────────────────────────────────────────────
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAngular", policy =>
            {
                policy
                    .WithOrigins("http://localhost:4200")
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials(); // required because Angular sends withCredentials: true
            });
        });
        
        // Database
        builder.Services.AddDbContext<FleetDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
        
        // Repositories (Ports -> Adapters)
        builder.Services.AddScoped<IVehicleRepositoryPort, VehicleRepositoryAdapter>();
        builder.Services.AddScoped<IDriverRepositoryPort, DriverRepositoryAdapter>();
        
        // Driver Service
        builder.Services.AddScoped<DriverService>();
        
        builder.Services.AddScoped<ICreateDriverUseCase>(sp => 
            sp.GetRequiredService<DriverService>());
        builder.Services.AddScoped<IUpdateDriverUseCase>(sp => 
            sp.GetRequiredService<DriverService>());
        builder.Services.AddScoped<IGetAllDriversUseCase>(sp => 
            sp.GetRequiredService<DriverService>());
        builder.Services.AddScoped<IGetDriverUseCase>(sp =>
            sp.GetRequiredService<DriverService>());
        builder.Services.AddScoped<IGetDriverByEmailUseCase>(sp =>
            sp.GetRequiredService<DriverService>());
        builder.Services.AddScoped<IDeleteDriverUseCase>(sp =>
            sp.GetRequiredService<DriverService>());
        
        // Vehicle Service
        builder.Services.AddScoped<VehicleService>();
        
        builder.Services.AddScoped<ICreateVehicleUseCase>(sp => 
            sp.GetRequiredService<VehicleService>());
        builder.Services.AddScoped<IUpdateVehicleUseCase>(sp => 
            sp.GetRequiredService<VehicleService>());
        builder.Services.AddScoped<IGetAllVehiclesUseCase>(sp => 
            sp.GetRequiredService<VehicleService>());
        builder.Services.AddScoped<IGetVehicleUseCase>(sp => 
            sp.GetRequiredService<VehicleService>());
        builder.Services.AddScoped<IDeleteVehicleUseCase>(sp => 
            sp.GetRequiredService<VehicleService>());
        
        // Controllers
        builder.Services.AddControllers();
        
        // Swagger / OpenAPI
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Fleet Service API",
                Version = "v1",
                Description = "Fleet Service API for vehicles and drivers",
            });
        });

        var app = builder.Build();

        // Apply EF Core migrations on startup so the schema exists in a fresh
        // database (e.g. the consolidated Postgres on OpenShift).
        using (var scope = app.Services.CreateScope())
        {
            scope.ServiceProvider.GetRequiredService<FleetDbContext>().Database.Migrate();
        }

        // Swagger UI in development
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Fleet Service API v1");
                c.RoutePrefix = string.Empty; // Swagger UI at root /
            });
        }

        app.UseCors("AllowAngular");
        app.MapControllers();
        app.Run();
    }
}