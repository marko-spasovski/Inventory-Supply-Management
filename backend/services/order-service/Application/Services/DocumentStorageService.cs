using order_service.Application.Interfaces;

namespace order_service.Application.Services;

public class DocumentStorageService : IDocumentStorageService
{
    private readonly string _basePath;
    private readonly ILogger<DocumentStorageService> _logger;
    private readonly IOrderRepository _repository;

    public DocumentStorageService(IConfiguration config, ILogger<DocumentStorageService> logger, IOrderRepository repository)
    {
        _logger = logger;
        // reads "DocumentStorage:BasePath" from appsettings.json, 
        // falls back to a folder next to the executable
        _basePath = config["DocumentStorage:BasePath"]
                    ?? Path.Combine(AppContext.BaseDirectory, "order-documents");
        _repository = repository;
    }
    
    public async Task<string> UploadOrderDocumentAsync(Guid orderId, IFormFile file)
    {
        _logger.LogInformation("Uploading document for orderId={OrderId}, file={FileName}",
            orderId, file.FileName);

        var order = await _repository.GetByIdAsync(orderId);
        if (order == null)
        {
            _logger.LogWarning("Order not found for document upload: orderId={OrderId}", orderId);
            throw new Exception("Order not found");
        }

        var savedPath = await SaveDocumentAsync(orderId, file);

        _logger.LogInformation("Document uploaded successfully for order {OrderId}", orderId);
        return savedPath;
    }
    
    
    public async Task<string> SaveDocumentAsync(Guid orderId, IFormFile file)
    {
        // Validate — only PDFs
        if (!file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase)
            && !file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only PDF files are accepted.");
        }

        // Each order gets its own folder: order-documents/{orderId}/
        var orderFolder = Path.Combine(_basePath, orderId.ToString());
        Directory.CreateDirectory(orderFolder);

        // Sanitise the original filename, keep it readable
        var safeFileName = Path.GetFileNameWithoutExtension(file.FileName)
            .Replace(" ", "_");
        var fileName = $"{safeFileName}_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";
        var fullPath = Path.Combine(orderFolder, fileName);

        await using var stream = new FileStream(fullPath, FileMode.Create, FileAccess.Write);
        await file.CopyToAsync(stream);

        _logger.LogInformation("PDF saved for order {OrderId} at {Path}", orderId, fullPath);
        return fullPath;
    }
}