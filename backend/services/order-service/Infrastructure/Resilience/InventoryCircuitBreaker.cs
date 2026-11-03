using Polly;
using Polly.CircuitBreaker;

namespace order_service.Infrastructure.Resilience;

/// <summary>
/// Circuit Breaker for outbound gRPC calls to inventory-service.
/// Opens after 50 % failures in a 30-second window (min. 3 calls).
/// While open, calls short-circuit immediately for 30 seconds, then
/// transition to half-open for a single probe request.
/// </summary>
public static class InventoryCircuitBreaker
{
    public static ResiliencePipeline Create(ILogger logger) =>
        new ResiliencePipelineBuilder()
            .AddCircuitBreaker(new CircuitBreakerStrategyOptions
            {
                ShouldHandle          = new PredicateBuilder().Handle<Exception>(),
                FailureRatio          = 0.5,
                SamplingDuration      = TimeSpan.FromSeconds(30),
                MinimumThroughput     = 3,
                BreakDuration         = TimeSpan.FromSeconds(30),

                OnOpened = args =>
                {
                    logger.LogWarning(
                        "[CircuitBreaker] OPEN — inventory-service unreachable. " +
                        "Stock updates suspended for {Duration}s.",
                        args.BreakDuration.TotalSeconds);
                    return ValueTask.CompletedTask;
                },
                OnClosed = args =>
                {
                    logger.LogInformation(
                        "[CircuitBreaker] CLOSED — inventory-service is reachable again.");
                    return ValueTask.CompletedTask;
                },
                OnHalfOpened = args =>
                {
                    logger.LogInformation(
                        "[CircuitBreaker] HALF-OPEN — sending probe request to inventory-service.");
                    return ValueTask.CompletedTask;
                },
            })
            .Build();
}
