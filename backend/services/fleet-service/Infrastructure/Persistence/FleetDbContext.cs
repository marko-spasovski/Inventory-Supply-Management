using fleet_service.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace fleet_service.Infrastructure.Persistence;

public class FleetDbContext : DbContext
{
    public FleetDbContext(DbContextOptions<FleetDbContext> options)
        : base(options)
    {
    }
    
    public DbSet<DriverEntity> Drivers => Set<DriverEntity>();
    public DbSet<VehicleEntity> Vehicles => Set<VehicleEntity>();
}