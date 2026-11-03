using fleet_service.Application.DTOs;
using fleet_service.Application.Ports.In;

using fleet_service.Domain.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace fleet_service.Presentation.Controllers;

[ApiController]
[Route("vehicles")]
public class VehicleController: ControllerBase
{
    private readonly ICreateVehicleUseCase _createVehicle;
    private readonly IGetVehicleUseCase _getVehicle;
    private readonly IGetAllVehiclesUseCase _getAllVehicles;
    private readonly IDeleteVehicleUseCase _deleteVehicle;
    private readonly IUpdateVehicleUseCase _updateVehicle;

    public VehicleController(
        ICreateVehicleUseCase createVehicle,
        IGetVehicleUseCase getVehicle,
        IGetAllVehiclesUseCase getAllVehicles,
        IDeleteVehicleUseCase deleteVehicle,
        IUpdateVehicleUseCase updateVehicle)
    {
        _createVehicle = createVehicle;
        _getVehicle = getVehicle;
        _getAllVehicles = getAllVehicles;
        _deleteVehicle = deleteVehicle;
        _updateVehicle = updateVehicle;
    }
    
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var vehicles = await _getAllVehicles.GetAllVehicles();
        return Ok(vehicles);
    }
    
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var vehicle = await _getVehicle.GetById(id);
            return Ok(vehicle);
        }
        catch (VehicleNotFoundException)
        {
            return NotFound();
        }
    }
    
    [HttpPost]
    public async Task<IActionResult> Create(CreateVehicleRequest request)
    {
        var vehicle = await _createVehicle.CreateVehicle(request);
        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, vehicle);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateVehicleRequest request)
    {
        try
        {
            var vehicle = await _updateVehicle.UpdateVehicle(id, request);
            return Ok(vehicle);
        }
        catch (VehicleNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id}")]
    public async Task Delete(Guid id)
    {
        await _deleteVehicle.DeleteById(id);
    }
}