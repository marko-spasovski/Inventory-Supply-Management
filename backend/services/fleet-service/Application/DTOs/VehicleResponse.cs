namespace fleet_service.Application.DTOs;

public class VehicleResponse
{
    public VehicleResponse(Guid id, string registrationPlate)
    {
        Id = id;
        RegistrationPlate = registrationPlate;
    }

    public Guid Id { get; set; }
    public string RegistrationPlate { get; set; } = null!;
}