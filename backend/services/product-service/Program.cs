using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using product_service.Application.Ports.In.Category;
using product_service.Application.Ports.In.Product;
using product_service.Application.Ports.Out;
using product_service.Application.Services;
using product_service.Infrastructure.Persistence;
using product_service.Infrastructure.Repositories;

namespace product_service;

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
        
        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        
        // Add EF Core with PostgreSQL
        builder.Services.AddDbContext<ProductDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

        // Dependency injection for repositories (infrastructure layer)
        builder.Services.AddScoped<IProductRepositoryPort, ProductRepositoryAdapter>();
        builder.Services.AddScoped<ICategoryRepositoryPort, CategoryRepositoryAdapter>();
        
        // Dependency injection for services/use cases (application layer)
        // Product Service
        builder.Services.AddScoped<ProductService>();
        builder.Services.AddScoped<ICreateProductUseCase, ProductService>();
        builder.Services.AddScoped<IUpdateProductUseCase, ProductService>();
        builder.Services.AddScoped<IGetAllProductsUseCase, ProductService>();
        builder.Services.AddScoped<IGetProductUseCase, ProductService>();
        builder.Services.AddScoped<IGetProductBySkuUseCase, ProductService>();
        builder.Services.AddScoped<IGetByCategoryUseCase, ProductService>();
        builder.Services.AddScoped<IDeleteProductUseCase, ProductService>();

        // CategoryService
        builder.Services.AddScoped<CategoryService>();
        builder.Services.AddScoped<ICreateCategoryUseCase, CategoryService>();
        builder.Services.AddScoped<IUpdateCategoryUseCase, CategoryService>();
        builder.Services.AddScoped<IGetAllCategoriesUseCase, CategoryService>();
        builder.Services.AddScoped<IGetCategoryUseCase, CategoryService>();
        builder.Services.AddScoped<IDeleteCategoryUseCase, CategoryService>();
        
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
            scope.ServiceProvider.GetRequiredService<ProductDbContext>().Database.Migrate();
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
        
        app.MapControllers();
        app.UseCors("AllowAngular");
        app.Run();
    }
}