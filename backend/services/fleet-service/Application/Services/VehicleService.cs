using fleet_service.Application.DTOs;
using fleet_service.Application.Mappers;
using fleet_service.Application.Ports.In;
using fleet_service.Application.Ports.Out;
using fleet_service.Domain.Entities;
using fleet_service.Domain.Exceptions;

namespace fleet_service.Application.Services;

public class VehicleService :
    ICreateVehicleUseCase,
    IGetAllVehiclesUseCase,
    IGetVehicleUseCase,
    IDeleteVehicleUseCase,
    IUpdateVehicleUseCase
{
    private readonly IVehicleRepositoryPort _repository;

    public VehicleService(IVehicleRepositoryPort repository)
    {
        _repository = repository;
    }

    public async Task<VehicleResponse> CreateVehicle(CreateVehicleRequest request)
    {

        var vehicle = Vehicle.Create(
            request.RegistrationPlate
        );
        
        var saved = await _repository.Save(vehicle);

        return VehicleMapper.ToResponse(saved);
    }

    public async Task<VehicleResponse> UpdateVehicle(Guid id, UpdateVehicleRequest request)
    {
        var vehicle = await _repository.GetById(id);

        if (vehicle == null)
        {
            throw new VehicleNotFoundException(id);
        }

        vehicle.Update(request.RegistrationPlate);
        
        var saved = await _repository.Save(vehicle);
        return VehicleMapper.ToResponse(saved);
    }
    
    public async Task<List<VehicleResponse>> GetAllVehicles()
    {
        var vehicles = await _repository.GetAll();

        return vehicles
            .Select(VehicleMapper.ToResponse)
            .ToList();
    }

    public async Task<VehicleResponse> GetById(Guid id)
    {
        var vehicle = await  _repository.GetById(id);

        if (vehicle == null)
        {
            throw new VehicleNotFoundException(id);
        }

        return VehicleMapper.ToResponse(vehicle);
    }
    
    public async Task DeleteById(Guid id)
    {
        var vehicle = await _repository.GetById(id);
        if (vehicle == null)
        {
            throw new VehicleNotFoundException(id);
        }

        await _repository.Delete(id);
    }
}