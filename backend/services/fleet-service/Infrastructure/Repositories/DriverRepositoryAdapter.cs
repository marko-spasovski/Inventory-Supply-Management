using fleet_service.Application.Mappers;
using fleet_service.Application.Ports.Out;
using fleet_service.Domain.Entities;
using fleet_service.Domain.Exceptions;
using fleet_service.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace fleet_service.Infrastructure.Repositories;

public class DriverRepositoryAdapter : IDriverRepositoryPort
{
    private readonly FleetDbContext _context;

    public DriverRepositoryAdapter(FleetDbContext context)
    {
        _context = context;
    }

    public async Task<Driver> Save(Driver driver)
    {
        if (driver.Id == Guid.Empty)
        {
            var entity = DriverMapper.ToEntity(driver);
            _context.Drivers.Add(entity);
            await _context.SaveChangesAsync();
            return DriverMapper.ToDomain(entity);
            
        }
        var tracked = await _context.Drivers.FindAsync(driver.Id);
        if (tracked == null)
        {
            var entity = DriverMapper.ToEntity(driver);
            _context.Drivers.Add(entity);
            await _context.SaveChangesAsync();
            return DriverMapper.ToDomain(entity);
        }
        tracked.Name = driver.Name;
        tracked.Phone = driver.Phone;
        tracked.Email = driver.Email;
        tracked.VehicleId = driver.VehicleId;
        tracked.CompanyId = driver.CompanyId;
        
        await _context.SaveChangesAsync();
        return DriverMapper.ToDomain(tracked);
    }

    public async Task<List<Driver>> GetAll()
    {
        var entities = await _context.Drivers.ToListAsync();
        
        return entities
            .Select(DriverMapper.ToDomain)
            .ToList();
    }

    public async Task<Driver?> GetById(Guid id)
    {
        var entity = await _context.Drivers
            .FirstOrDefaultAsync(d => d.Id == id);

        if (entity == null)
        {
            return null;
        }

        return DriverMapper.ToDomain(entity);
    }

    public async Task<Driver?> GetByEmail(string email)
    {
        var normalized = email.Trim();
        if (string.IsNullOrEmpty(normalized)) return null;

        // Case-insensitive match via lowered comparison so JWT-supplied email
        // case doesn't matter.
        var entity = await _context.Drivers
            .FirstOrDefaultAsync(d => d.Email.ToLower() == normalized.ToLower());

        return entity == null ? null : DriverMapper.ToDomain(entity);
    }

    public async Task<Driver?> DeleteById(Guid id)
    {
        var entity = await _context.Drivers
            .FirstOrDefaultAsync(d => d.Id == id);

        if (entity == null)
        {
            return null;
        }
        
        _context.Drivers.Remove(entity);
        await _context.SaveChangesAsync();
        
        return DriverMapper.ToDomain(entity);
    }
}