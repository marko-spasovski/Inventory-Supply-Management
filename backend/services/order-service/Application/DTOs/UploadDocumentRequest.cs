namespace order_service.Application.DTOs;

public class UploadDocumentRequest
{
    public Guid OrderId { get; set; }
    public IFormFile File { get; set; } = null!;
}