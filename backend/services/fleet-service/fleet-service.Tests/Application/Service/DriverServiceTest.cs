using fleet_service.Application.DTOs;
using fleet_service.Application.Ports.Out;
using fleet_service.Application.Services;
using fleet_service.Domain.Entities;
using fleet_service.Domain.Exceptions;
using Moq;
using Xunit;

namespace FleetService.Tests.Application.Service;

public class DriverServiceTest
{
    private readonly Mock<IDriverRepositoryPort> _driverRepoMock;
    private readonly Mock<IVehicleRepositoryPort> _vehicleRepoMock;
    private readonly DriverService _service;

    public DriverServiceTest()
    {
        _driverRepoMock = new Mock<IDriverRepositoryPort>();
        _vehicleRepoMock = new Mock<IVehicleRepositoryPort>();
        _service = new DriverService(_vehicleRepoMock.Object, _driverRepoMock.Object);
    }

    private static Driver MakeDriver() =>
        Driver.Create("Alice", "555", "a@x.com", Guid.NewGuid(), Guid.NewGuid());

    [Fact]
    public async Task CreateDriver_Succeeds_WhenVehicleExists()
    {
        var vehicleId = Guid.NewGuid();
        var companyId = Guid.NewGuid();
        var vehicle = new Vehicle(vehicleId, "PLATE");
        _vehicleRepoMock.Setup(v => v.GetById(vehicleId)).ReturnsAsync(vehicle);
        _driverRepoMock.Setup(d => d.Save(It.IsAny<Driver>())).ReturnsAsync((Driver d) => d);

        var resp = await _service.CreateDriver(new CreateDriverRequest
        {
            Name = "Alice",
            Phone = "555",
            Email = "a@x.com",
            VehicleId = vehicleId,
            CompanyId = companyId
        });

        Assert.Equal("Alice", resp.Name);
        Assert.Equal("a@x.com", resp.Email);
        Assert.Equal(vehicleId, resp.VehicleId);
        Assert.Equal(companyId, resp.CompanyId);
        _driverRepoMock.Verify(d => d.Save(It.IsAny<Driver>()), Times.Once);
    }

    [Fact]
    public async Task CreateDriver_Throws_WhenVehicleMissing()
    {
        _vehicleRepoMock.Setup(v => v.GetById(It.IsAny<Guid>())).ReturnsAsync((Vehicle?)null);

        await Assert.ThrowsAsync<Exception>(() => _service.CreateDriver(new CreateDriverRequest
        {
            Name = "A", Phone = "1", Email = "a@x.com",
            VehicleId = Guid.NewGuid(), CompanyId = Guid.NewGuid()
        }));
        _driverRepoMock.Verify(d => d.Save(It.IsAny<Driver>()), Times.Never);
    }

    [Fact]
    public async Task UpdateDriver_Succeeds_WhenDriverAndVehicleExist()
    {
        var driver = MakeDriver();
        var vehicle = new Vehicle(Guid.NewGuid(), "PLATE");
        _driverRepoMock.Setup(d => d.GetById(driver.Id)).ReturnsAsync(driver);
        _vehicleRepoMock.Setup(v => v.GetById(It.IsAny<Guid>())).ReturnsAsync(vehicle);
        _driverRepoMock.Setup(d => d.Save(It.IsAny<Driver>())).ReturnsAsync((Driver d) => d);

        var resp = await _service.UpdateDriver(driver.Id, new UpdateDriverRequest
        {
            Name = "Bob", Phone = "222", Email = "b@x.com",
            VehicleId = vehicle.Id, CompanyId = Guid.NewGuid()
        });

        Assert.Equal("Bob", resp.Name);
        Assert.Equal("b@x.com", resp.Email);
        _driverRepoMock.Verify(d => d.Save(It.IsAny<Driver>()), Times.Once);
    }

    [Fact]
    public async Task UpdateDriver_Throws_WhenDriverMissing()
    {
        var id = Guid.NewGuid();
        _driverRepoMock.Setup(d => d.GetById(id)).ReturnsAsync((Driver?)null);

        await Assert.ThrowsAsync<DriverNotFoundException>(() => _service.UpdateDriver(id, new UpdateDriverRequest
        {
            Name = "X", Phone = "1", Email = "x@x.com",
            VehicleId = Guid.NewGuid(), CompanyId = Guid.NewGuid()
        }));
    }

    [Fact]
    public async Task UpdateDriver_Throws_WhenVehicleMissing()
    {
        var driver = MakeDriver();
        _driverRepoMock.Setup(d => d.GetById(driver.Id)).ReturnsAsync(driver);
        _vehicleRepoMock.Setup(v => v.GetById(It.IsAny<Guid>())).ReturnsAsync((Vehicle?)null);

        await Assert.ThrowsAsync<VehicleNotFoundException>(() => _service.UpdateDriver(driver.Id, new UpdateDriverRequest
        {
            Name = "X", Phone = "1", Email = "x@x.com",
            VehicleId = Guid.NewGuid(), CompanyId = Guid.NewGuid()
        }));
    }

    [Fact]
    public async Task GetAllDrivers_MapsAllToResponses()
    {
        _driverRepoMock.Setup(d => d.GetAll()).ReturnsAsync(new List<Driver>
        {
            MakeDriver(),
            MakeDriver()
        });

        var list = await _service.GetAllDrivers();

        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task GetDriverById_ReturnsResponse_WhenFound()
    {
        var d = MakeDriver();
        _driverRepoMock.Setup(r => r.GetById(d.Id)).ReturnsAsync(d);

        var resp = await _service.GetDriverById(d.Id);

        Assert.Equal(d.Id, resp.Id);
        Assert.Equal(d.Email, resp.Email);
    }

    [Fact]
    public async Task GetDriverById_Throws_WhenMissing()
    {
        var id = Guid.NewGuid();
        _driverRepoMock.Setup(r => r.GetById(id)).ReturnsAsync((Driver?)null);

        await Assert.ThrowsAsync<DriverNotFoundException>(() => _service.GetDriverById(id));
    }

    [Fact]
    public async Task GetDriverByEmail_ReturnsNull_WhenEmailBlank()
    {
        var resp = await _service.GetDriverByEmail("  ");
        Assert.Null(resp);
        _driverRepoMock.Verify(r => r.GetByEmail(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetDriverByEmail_ReturnsNull_WhenNotFound()
    {
        _driverRepoMock.Setup(r => r.GetByEmail("a@x.com")).ReturnsAsync((Driver?)null);
        Assert.Null(await _service.GetDriverByEmail("a@x.com"));
    }

    [Fact]
    public async Task GetDriverByEmail_ReturnsResponse_WhenFound()
    {
        var d = MakeDriver();
        _driverRepoMock.Setup(r => r.GetByEmail(d.Email)).ReturnsAsync(d);

        var resp = await _service.GetDriverByEmail(d.Email);

        Assert.NotNull(resp);
        Assert.Equal(d.Email, resp!.Email);
    }

    [Fact]
    public async Task DeleteById_DeletesAndSucceeds_WhenDriverExists()
    {
        var d = MakeDriver();
        _driverRepoMock.Setup(r => r.GetById(d.Id)).ReturnsAsync(d);
        _driverRepoMock.Setup(r => r.DeleteById(d.Id)).ReturnsAsync(d);

        await _service.DeleteById(d.Id);

        _driverRepoMock.Verify(r => r.DeleteById(d.Id), Times.Once);
    }

    [Fact]
    public async Task DeleteById_Throws_WhenDriverMissing()
    {
        var id = Guid.NewGuid();
        _driverRepoMock.Setup(r => r.GetById(id)).ReturnsAsync((Driver?)null);

        await Assert.ThrowsAsync<DriverNotFoundException>(() => _service.DeleteById(id));
        _driverRepoMock.Verify(r => r.DeleteById(It.IsAny<Guid>()), Times.Never);
    }
}
