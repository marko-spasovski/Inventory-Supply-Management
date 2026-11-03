using fleet_service.Application.DTOs;
using fleet_service.Application.Ports.In;
using fleet_service.Domain.Exceptions;
using fleet_service.Presentation.Controllers;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace FleetService.Tests.Presentation.Controllers;

public class VehicleControllerTest
{
    private readonly Mock<ICreateVehicleUseCase> _create = new();
    private readonly Mock<IGetVehicleUseCase> _get = new();
    private readonly Mock<IGetAllVehiclesUseCase> _getAll = new();
    private readonly Mock<IDeleteVehicleUseCase> _delete = new();
    private readonly Mock<IUpdateVehicleUseCase> _update = new();
    private readonly VehicleController _controller;

    public VehicleControllerTest()
    {
        _controller = new VehicleController(_create.Object, _get.Object, _getAll.Object,
            _delete.Object, _update.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsOkWithList()
    {
        _getAll.Setup(g => g.GetAllVehicles()).ReturnsAsync(new List<VehicleResponse>
        {
            new(Guid.NewGuid(), "A"),
            new(Guid.NewGuid(), "B")
        });

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<List<VehicleResponse>>(ok.Value);
        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task GetById_ReturnsOk_WhenFound()
    {
        var id = Guid.NewGuid();
        _get.Setup(g => g.GetById(id)).ReturnsAsync(new VehicleResponse(id, "X"));

        var result = await _controller.GetById(id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var r = Assert.IsType<VehicleResponse>(ok.Value);
        Assert.Equal(id, r.Id);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _get.Setup(g => g.GetById(id)).ThrowsAsync(new VehicleNotFoundException(id));

        var result = await _controller.GetById(id);
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Create_ReturnsCreatedAtAction()
    {
        var resp = new VehicleResponse(Guid.NewGuid(), "PLATE");
        _create.Setup(c => c.CreateVehicle(It.IsAny<CreateVehicleRequest>())).ReturnsAsync(resp);

        var result = await _controller.Create(new CreateVehicleRequest { RegistrationPlate = "PLATE" });

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(resp, created.Value);
    }

    [Fact]
    public async Task Update_ReturnsOk_WhenSucceeds()
    {
        var id = Guid.NewGuid();
        var resp = new VehicleResponse(id, "NEW");
        _update.Setup(u => u.UpdateVehicle(id, It.IsAny<UpdateVehicleRequest>())).ReturnsAsync(resp);

        var result = await _controller.Update(id, new UpdateVehicleRequest { RegistrationPlate = "NEW" });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(resp, ok.Value);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _update.Setup(u => u.UpdateVehicle(id, It.IsAny<UpdateVehicleRequest>()))
            .ThrowsAsync(new VehicleNotFoundException(id));

        var result = await _controller.Update(id, new UpdateVehicleRequest { RegistrationPlate = "X" });

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_DelegatesToUseCase()
    {
        var id = Guid.NewGuid();
        _delete.Setup(d => d.DeleteById(id)).Returns(Task.CompletedTask);

        await _controller.Delete(id);

        _delete.Verify(d => d.DeleteById(id), Times.Once);
    }
}
