using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace fleet_service.Infrastructure.Persistence.Entities;

[Table("drivers")]
public class DriverEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; }

    [Required]
    [Column("phone")]
    public string Phone { get; set; }

    [Required]
    [Column("email")]
    public string Email { get; set; }

    [Required]
    [Column("company_id")]
    public Guid CompanyId { get; set; }

    [Required]
    [Column("vehicle_id")]
    public Guid VehicleId { get; set; }

    protected DriverEntity() { }

    public DriverEntity(Guid id, string name, string phone, string email, Guid vehicleId, Guid companyId)
    {
        Id = id;
        Name = name;
        Phone = phone;
        Email = email;
        VehicleId = vehicleId;
        CompanyId = companyId;
    }
}