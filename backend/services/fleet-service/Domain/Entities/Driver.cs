namespace fleet_service.Domain.Entities;

public class Driver
{
    public Guid Id { get; private set; }   // private set, enforce creation rules
    public string Name { get; private set; }
    public string Phone { get; private set; }
    public string Email { get; private set; }
    public Guid VehicleId { get; private set; }
    public Guid CompanyId { get; private set; }

    // Constructor enforces rules
    public Driver(Guid id, string name, string phone, string email, Guid vehicleId, Guid companyId)
    {
        Id = id;
        Name = name ?? throw new ArgumentNullException(nameof(name));
        Phone = phone ?? throw new ArgumentNullException(nameof(phone));
        Email = email ?? throw new ArgumentNullException(nameof(email));
        VehicleId = vehicleId;
        CompanyId = companyId;
    }
    
    // Factory method for creation
    public static Driver Create(string name, string phone, string email, Guid vehicleId, Guid companyId)
    {
        return new Driver(
            Guid.NewGuid(),
            name,
            phone,
            email,
            vehicleId,
            companyId
        );
    }

    // Update method
    public void Update(string name, string phone, string email, Guid vehicleId, Guid companyId)
    {
        Name = name ?? throw new ArgumentNullException(nameof(name));
        Phone = phone ?? throw new ArgumentNullException(nameof(phone));
        Email = email ?? throw new ArgumentNullException(nameof(email));
        VehicleId = vehicleId;
        CompanyId = companyId;
    }
}