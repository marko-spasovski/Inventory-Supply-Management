namespace order_service.Application.Interfaces;

public interface IDocumentStorageService
{
    Task<string> SaveDocumentAsync(Guid orderId, IFormFile file);
    Task<string> UploadOrderDocumentAsync(Guid orderId, IFormFile file);
}