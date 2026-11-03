using Microsoft.EntityFrameworkCore;
using order_service.Application.Interfaces;
using order_service.Infrastructure.Grpc;
using order_service.Infrastructure.Persistence;
using order_service.Application.Services;
using order_service.Infrastructure.Kafka;
using order_service.Infrastructure.Resilience;
using order_service.Infrastructure.Security;
using Polly;

namespace order_service;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        
        // Controllers
        builder.Services.AddControllers();

        // Kafka
        builder.Services.AddSingleton<IKafkaProducer, KafkaProducer>();
        
        // Dependency Injection
        builder.Services.AddScoped<IOrderService, Application.Services.OrderService>();
        builder.Services.AddScoped<IOrderRepository, OrderRepository>();
        
        builder.Services.AddScoped<IDocumentStorageService, DocumentStorageService>();

        // Circuit Breaker — shared singleton protecting all gRPC calls to inventory-service
        builder.Services.AddSingleton<ResiliencePipeline>(sp =>
            InventoryCircuitBreaker.Create(
                sp.GetRequiredService<ILogger<InventoryGrpcClient>>()));

        builder.Services.AddScoped<IInventoryGrpcClient, InventoryGrpcClient>();
        // Database
        builder.Services.AddDbContext<OrderDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

        // Swagger
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new()
            {
                Title = "Order Service API",
                Version = "v1",
                Description = "API for managing orders"
            });
        });

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<RequestContext>();   

        var app = builder.Build();

        // Apply EF Core migrations on startup so the schema exists in a fresh
        // database (e.g. the consolidated Postgres on OpenShift).
        using (var scope = app.Services.CreateScope())
        {
            scope.ServiceProvider.GetRequiredService<OrderDbContext>().Database.Migrate();
        }

        // ✅ Enable Swagger ONLY in development
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();

            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "Order Service API v1");
                options.RoutePrefix = string.Empty; // Opens Swagger at root (http://localhost:xxxx/)
            });
        }
        
        app.UseHttpsRedirection();

        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}