namespace fleet_service.Domain.Exceptions;

public class DriverNotFoundException: Exception
{
    public DriverNotFoundException(Guid id)
        : base($"Driver {id} not found") {}
}


// TODO