using System.ComponentModel.DataAnnotations;

namespace fleet_service.Application.DTOs;

public class CreateVehicleRequest
{
    [Required] 
    public string RegistrationPlate { get; set; } = null!;
}