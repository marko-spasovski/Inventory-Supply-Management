namespace product_service.Domain.Exceptions;

public class ProductNotFoundException: Exception
{
    public ProductNotFoundException(Guid id)
        : base($"Vehicle with id {id} was not found."){}
}