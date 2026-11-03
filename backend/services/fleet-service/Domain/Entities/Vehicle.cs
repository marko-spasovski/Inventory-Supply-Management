namespace fleet_service.Domain.Entities;

public class Vehicle
{
    public Guid Id { get; set; }
    public string RegistrationPlate { get; set; }

    public Vehicle(Guid id, string registrationPlate)
    {
        Id = id;
        RegistrationPlate = registrationPlate;
    }

    public static Vehicle Create(string registrationPlate)
    {
        return new Vehicle(
            Guid.NewGuid(),
            registrationPlate
        );
    }

    public void Update(string registrationPlate)
    {
        RegistrationPlate = registrationPlate;
    }
}