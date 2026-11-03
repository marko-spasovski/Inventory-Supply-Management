using fleet_service.Application.DTOs;
using fleet_service.Application.Ports.In;
using fleet_service.Domain.Exceptions;
using fleet_service.Presentation.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace FleetService.Tests.Presentation.Controllers;

public class DriverControllerTest
{
    private readonly Mock<ICreateDriverUseCase> _create = new();
    private readonly Mock<IUpdateDriverUseCase> _update = new();
    private readonly Mock<IGetAllDriversUseCase> _getAll = new();
    private readonly Mock<IGetDriverUseCase> _get = new();
    private readonly Mock<IGetDriverByEmailUseCase> _getByEmail = new();
    private readonly Mock<IDeleteDriverUseCase> _delete = new();
    private readonly DriverController _controller;

    public DriverControllerTest()
    {
        _controller = new DriverController(_create.Object, _update.Object, _getAll.Object,
            _get.Object, _getByEmail.Object, _delete.Object)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
    }

    private static DriverResponse SampleResponse(Guid id) =>
        new(id, "Alice", "555", "a@x.com", Guid.NewGuid(), Guid.NewGuid());

    [Fact]
    public async Task GetAll_ReturnsOkWithList()
    {
        _getAll.Setup(g => g.GetAllDrivers()).ReturnsAsync(new List<DriverResponse>
        {
            SampleResponse(Guid.NewGuid()),
            SampleResponse(Guid.NewGuid())
        });

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<List<DriverResponse>>(ok.Value);
        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task GetById_ReturnsOk_WhenFound()
    {
        var id = Guid.NewGuid();
        _get.Setup(g => g.GetDriverById(id)).ReturnsAsync(SampleResponse(id));

        var result = await _controller.GetById(id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var resp = Assert.IsType<DriverResponse>(ok.Value);
        Assert.Equal(id, resp.Id);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _get.Setup(g => g.GetDriverById(id)).ThrowsAsync(new DriverNotFoundException(id));

        var result = await _controller.GetById(id);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Create_ReturnsCreatedAtAction()
    {
        var resp = SampleResponse(Guid.NewGuid());
        _create.Setup(c => c.CreateDriver(It.IsAny<CreateDriverRequest>())).ReturnsAsync(resp);

        var result = await _controller.Create(new CreateDriverRequest
        {
            Name = "X", Phone = "1", Email = "x@x.com",
            VehicleId = Guid.NewGuid(), CompanyId = Guid.NewGuid()
        });

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(resp, created.Value);
    }

    [Fact]
    public async Task Update_ReturnsOk_WhenSucceeds()
    {
        var id = Guid.NewGuid();
        var resp = SampleResponse(id);
        _update.Setup(u => u.UpdateDriver(id, It.IsAny<UpdateDriverRequest>())).ReturnsAsync(resp);

        var result = await _controller.Update(id, new UpdateDriverRequest
        {
            Name = "X", Phone = "1", Email = "x@x.com",
            VehicleId = Guid.NewGuid(), CompanyId = Guid.NewGuid()
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(resp, ok.Value);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _update.Setup(u => u.UpdateDriver(id, It.IsAny<UpdateDriverRequest>()))
            .ThrowsAsync(new DriverNotFoundException(id));

        var result = await _controller.Update(id, new UpdateDriverRequest
        {
            Name = "X", Phone = "1", Email = "x@x.com",
            VehicleId = Guid.NewGuid(), CompanyId = Guid.NewGuid()
        });

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Delete_ReturnsNoContent_WhenSucceeds()
    {
        var id = Guid.NewGuid();
        _delete.Setup(d => d.DeleteById(id)).Returns(Task.CompletedTask);

        var result = await _controller.Delete(id);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _delete.Setup(d => d.DeleteById(id)).ThrowsAsync(new DriverNotFoundException(id));

        var result = await _controller.Delete(id);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetMe_ReturnsBadRequest_WhenHeaderMissing()
    {
        var result = await _controller.GetMe();
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetMe_ReturnsNotFound_WhenNoDriver()
    {
        _controller.ControllerContext.HttpContext.Request.Headers["X-User-Email"] = "ghost@x.com";
        _getByEmail.Setup(g => g.GetDriverByEmail("ghost@x.com")).ReturnsAsync((DriverResponse?)null);

        var result = await _controller.GetMe();
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetMe_ReturnsOk_WhenDriverFound()
    {
        var resp = SampleResponse(Guid.NewGuid());
        _controller.ControllerContext.HttpContext.Request.Headers["X-User-Email"] = resp.Email;
        _getByEmail.Setup(g => g.GetDriverByEmail(resp.Email)).ReturnsAsync(resp);

        var result = await _controller.GetMe();
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(resp, ok.Value);
    }
}
