namespace product_service.Application.Ports.In.Category;

public interface IDeleteCategoryUseCase
{
    Task DeleteById(Guid id);
}