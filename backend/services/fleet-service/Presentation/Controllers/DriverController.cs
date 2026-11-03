using fleet_service.Application.DTOs;
using fleet_service.Application.Ports.In;
using fleet_service.Domain.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace fleet_service.Presentation.Controllers;

[ApiController]
[Route("drivers")]
public class DriverController: ControllerBase
{
    private readonly ICreateDriverUseCase _createDriver;
    private readonly IUpdateDriverUseCase _updateDriver;
    private readonly IGetAllDriversUseCase _getAllDrivers;
    private readonly IGetDriverUseCase _getDriver;
    private readonly IGetDriverByEmailUseCase _getDriverByEmail;
    private readonly IDeleteDriverUseCase _deleteDriver;

    public DriverController(ICreateDriverUseCase createDriver, IUpdateDriverUseCase updateDriverUse, IGetAllDriversUseCase getAllDrivers, IGetDriverUseCase getDriver, IGetDriverByEmailUseCase getDriverByEmail, IDeleteDriverUseCase deleteDriver)
    {
        _createDriver = createDriver;
        _updateDriver = updateDriverUse;
        _getAllDrivers = getAllDrivers;
        _getDriver = getDriver;
        _getDriverByEmail = getDriverByEmail;
        _deleteDriver = deleteDriver;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var drivers = await _getAllDrivers.GetAllDrivers();
        return Ok(drivers);
    }

    // GET /drivers/me — resolves the driver whose email matches the
    // X-User-Email header forwarded by mobile-gateway. Used by DRIVER role
    // to fetch their own record. Must precede the /:id route.
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var email = Request.Headers["X-User-Email"].ToString();
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { error = "Bad Request", message = "X-User-Email header missing." });
        }
        var driver = await _getDriverByEmail.GetDriverByEmail(email);
        if (driver == null)
        {
            return NotFound(new { error = "Not Found", message = $"No driver registered for {email}." });
        }
        return Ok(driver);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var driver = await _getDriver.GetDriverById(id);
            return Ok(driver);
        }
        catch (DriverNotFoundException ex)
        {
            return NotFound(new {message = ex.Message});
        }
    }
    
    [HttpPost]
    public async Task<IActionResult> Create(CreateDriverRequest request)
    {
        var driver = await _createDriver.CreateDriver(request);
        return CreatedAtAction(nameof(GetById), new { id = driver.Id }, driver);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateDriverRequest request)
    {
        try
        {
            var driver = await _updateDriver.UpdateDriver(id, request);

            return Ok(driver);
        }
        catch (DriverNotFoundException ex)
        {
            return NotFound(new {message = ex.Message});
        }
    }
    

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _deleteDriver.DeleteById(id);
            return NoContent();
        }
        catch(DriverNotFoundException ex)
        {
            return NotFound(new {message = ex.Message});
        }
    }
}