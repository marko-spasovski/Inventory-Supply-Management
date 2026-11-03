namespace fleet_service.Domain.Exceptions;

public class VehicleNotFoundException: Exception
{
    public VehicleNotFoundException(Guid id)
        : base($"Vehicle with id {id} not found") {}
}


//TODO