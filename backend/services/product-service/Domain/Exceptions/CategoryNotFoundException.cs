namespace product_service.Domain.Exceptions;

public class CategoryNotFoundException: Exception
{
    public CategoryNotFoundException(Guid id)
        : base($"Category with id {id} was not found.") {}
}