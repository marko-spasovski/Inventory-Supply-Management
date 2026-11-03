using fleet_service.Application.DTOs;
using fleet_service.Application.Ports.Out;
using fleet_service.Application.Services;
using fleet_service.Domain.Entities;
using fleet_service.Domain.Exceptions;
using Moq;
using Xunit;

namespace FleetService.Tests.Application.Service;

public class VehicleServiceTest
{
    private readonly Mock<IVehicleRepositoryPort> _repoMock;
    private readonly VehicleService _service;

    public VehicleServiceTest()
    {
        _repoMock = new Mock<IVehicleRepositoryPort>();
        _service = new VehicleService(_repoMock.Object);
    }

    [Fact]
    public async Task CreateVehicle_PersistsAndReturnsResponse()
    {
        _repoMock.Setup(r => r.Save(It.IsAny<Vehicle>())).ReturnsAsync((Vehicle v) => v);

        var resp = await _service.CreateVehicle(new CreateVehicleRequest { RegistrationPlate = "AB-123" });

        Assert.Equal("AB-123", resp.RegistrationPlate);
        Assert.NotEqual(Guid.Empty, resp.Id);
        _repoMock.Verify(r => r.Save(It.IsAny<Vehicle>()), Times.Once);
    }

    [Fact]
    public async Task UpdateVehicle_Succeeds_WhenFound()
    {
        var v = new Vehicle(Guid.NewGuid(), "OLD");
        _repoMock.Setup(r => r.GetById(v.Id)).ReturnsAsync(v);
        _repoMock.Setup(r => r.Save(It.IsAny<Vehicle>())).ReturnsAsync((Vehicle x) => x);

        var resp = await _service.UpdateVehicle(v.Id, new UpdateVehicleRequest { RegistrationPlate = "NEW" });

        Assert.Equal("NEW", resp.RegistrationPlate);
        _repoMock.Verify(r => r.Save(v), Times.Once);
    }

    [Fact]
    public async Task UpdateVehicle_Throws_WhenMissing()
    {
        var id = Guid.NewGuid();
        _repoMock.Setup(r => r.GetById(id)).ReturnsAsync((Vehicle?)null);

        await Assert.ThrowsAsync<VehicleNotFoundException>(() =>
            _service.UpdateVehicle(id, new UpdateVehicleRequest { RegistrationPlate = "NEW" }));
    }

    [Fact]
    public async Task GetAllVehicles_MapsAll()
    {
        _repoMock.Setup(r => r.GetAll()).ReturnsAsync(new List<Vehicle>
        {
            new(Guid.NewGuid(), "A"),
            new(Guid.NewGuid(), "B")
        });

        var list = await _service.GetAllVehicles();

        Assert.Equal(2, list.Count);
        Assert.Equal("A", list[0].RegistrationPlate);
    }

    [Fact]
    public async Task GetById_ReturnsResponse_WhenFound()
    {
        var v = new Vehicle(Guid.NewGuid(), "PLATE");
        _repoMock.Setup(r => r.GetById(v.Id)).ReturnsAsync(v);

        var resp = await _service.GetById(v.Id);

        Assert.Equal(v.Id, resp.Id);
        Assert.Equal("PLATE", resp.RegistrationPlate);
    }

    [Fact]
    public async Task GetById_Throws_WhenMissing()
    {
        var id = Guid.NewGuid();
        _repoMock.Setup(r => r.GetById(id)).ReturnsAsync((Vehicle?)null);

        await Assert.ThrowsAsync<VehicleNotFoundException>(() => _service.GetById(id));
    }

    [Fact]
    public async Task DeleteById_DeletesAndSucceeds_WhenVehicleExists()
    {
        var v = new Vehicle(Guid.NewGuid(), "X");
        _repoMock.Setup(r => r.GetById(v.Id)).ReturnsAsync(v);
        _repoMock.Setup(r => r.Delete(v.Id)).ReturnsAsync(v);

        await _service.DeleteById(v.Id);

        _repoMock.Verify(r => r.Delete(v.Id), Times.Once);
    }

    [Fact]
    public async Task DeleteById_Throws_WhenMissing()
    {
        var id = Guid.NewGuid();
        _repoMock.Setup(r => r.GetById(id)).ReturnsAsync((Vehicle?)null);

        await Assert.ThrowsAsync<VehicleNotFoundException>(() => _service.DeleteById(id));
        _repoMock.Verify(r => r.Delete(It.IsAny<Guid>()), Times.Never);
    }
}
