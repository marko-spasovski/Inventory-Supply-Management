namespace fleet_service.Application.DTOs;

public class DriverResponse
{
    public DriverResponse(Guid id, string name, string phone, string email, Guid vehicleId, Guid companyId)
    {
        Id = id;
        Name = name;
        Phone = phone;
        Email = email;
        VehicleId = vehicleId;
        CompanyId = companyId;
    }

    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public string Email { get; set; } = null!;

    public Guid VehicleId { get; set; }
    public Guid CompanyId { get; set; }
}