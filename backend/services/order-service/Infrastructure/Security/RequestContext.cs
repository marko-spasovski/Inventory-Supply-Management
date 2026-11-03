namespace order_service.Infrastructure.Security;

public class RequestContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RequestContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string GetUserEmail() => GetRequiredHeader("X-User-Email");
    public string GetUserRole()  => GetRequiredHeader("X-User-Role");
    public string GetUserId()    => GetRequiredHeader("X-User-Id");

    private string GetRequiredHeader(string name)
    {
        var value = _httpContextAccessor.HttpContext?.Request.Headers[name].ToString();
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"Missing internal header: {name}");
        return value;
    }
}