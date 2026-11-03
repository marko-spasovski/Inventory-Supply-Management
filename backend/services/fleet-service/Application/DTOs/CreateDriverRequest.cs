using System.ComponentModel.DataAnnotations;

namespace fleet_service.Application.DTOs;

public class CreateDriverRequest
{
    [Required] 
    public string Name { get; set; } = null!;
    [Required]
    public string Phone { get; set; } = null!;
    [Required]
    public string Email { get; set; }
    [Required]
    public Guid VehicleId { get; set; }
    [Required]
    public Guid CompanyId { get; set; }
    
}