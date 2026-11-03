using fleet_service.Application.Mappers;
using fleet_service.Application.Ports.Out;
using fleet_service.Domain.Entities;
using fleet_service.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace fleet_service.Infrastructure.Repositories;

public class VehicleRepositoryAdapter: IVehicleRepositoryPort
{
    private readonly FleetDbContext _context;
    
    public VehicleRepositoryAdapter(FleetDbContext context)
    {
        _context = context;
    }

    public async Task<Vehicle> Save(Vehicle vehicle)
    {
        if (vehicle.Id == Guid.Empty) // brand-new vehicle
        {
            var entity = VehicleMapper.ToEntity(vehicle);
            _context.Vehicles.Add(entity);
            await _context.SaveChangesAsync();
            return VehicleMapper.ToDomain(entity);
        }

        // Updating existing vehicle
        var tracked = await _context.Vehicles.FindAsync(vehicle.Id); // tracked entity from DbContext
        if (tracked == null)
        {
            // vehicle does not exist in DB, treat as create
            var entity = VehicleMapper.ToEntity(vehicle);
            _context.Vehicles.Add(entity);
            await _context.SaveChangesAsync();
            return VehicleMapper.ToDomain(entity);
        }

        // Vehicle exists and is tracked → update its properties
        tracked.RegistrationPlate = vehicle.RegistrationPlate;

        await _context.SaveChangesAsync();
        return VehicleMapper.ToDomain(tracked);
    }

    public async Task<List<Vehicle>> GetAll()
    {
        return await _context.Vehicles
            .Select(x => VehicleMapper.ToDomain(x))
            .ToListAsync();
    }

    public async Task<Vehicle?> GetById(Guid id)
    {
        var entity = await _context.Vehicles.FindAsync(id);

        if (entity == null)
        {
            return null;
        }
        
        return VehicleMapper.ToDomain(entity);
    }

    public async Task<Vehicle?> Delete(Guid id)
    {
        var entity = await _context.Vehicles.FindAsync(id);

        if (entity == null)
        {
            return null;
        }
        
        _context.Vehicles.Remove(entity);
        await _context.SaveChangesAsync();

        return VehicleMapper.ToDomain(entity);
    }
}