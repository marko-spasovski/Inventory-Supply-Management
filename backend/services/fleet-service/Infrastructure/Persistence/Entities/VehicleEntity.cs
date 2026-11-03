using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using fleet_service.Domain.Entities;

namespace fleet_service.Infrastructure.Persistence.Entities;

[Table("vehicles")]
public class VehicleEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; }

    [Required]
    [Column("registration_plate")]
    public string RegistrationPlate { get; set; }
    

    protected VehicleEntity() { }

    public VehicleEntity(Guid id, string plate)
    {
        Id = id;
        RegistrationPlate = plate;
    }
}