namespace product_service.Application.Ports.In.Product;

public interface IDeleteProductUseCase
{
    Task DeleteById(Guid id);
}