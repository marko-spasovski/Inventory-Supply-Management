using Microsoft.Extensions.Logging;
using Moq;
using order_service.Infrastructure.Grpc;
using Polly;
using Polly.CircuitBreaker;
using Xunit;

namespace OrderService.Tests.Infrastructure.Grpc;

public class InventoryGrpcClientTest
{
    private readonly Mock<ILogger<InventoryGrpcClient>> _loggerMock = new();

    private static ResiliencePipeline BuildOpenCircuit()
    {
        var pipeline = new ResiliencePipelineBuilder()
            .AddCircuitBreaker(new CircuitBreakerStrategyOptions
            {
                ShouldHandle      = new PredicateBuilder().Handle<Exception>(),
                FailureRatio      = 0.01,
                SamplingDuration  = TimeSpan.FromSeconds(10),
                MinimumThroughput = 2,  // Polly minimum is 2
                BreakDuration     = TimeSpan.FromMinutes(5),
            })
            .Build();

        // Trip the circuit open with two failures (MinimumThroughput = 2)
        for (int i = 0; i < 2; i++)
            try { pipeline.Execute(() => throw new InvalidOperationException("trip")); } catch { }

        return pipeline;
    }

    [Fact]
    public async Task SendInventoryAsync_DoesNotThrow_WhenCircuitIsOpen()
    {
        var client = new InventoryGrpcClient(BuildOpenCircuit(), _loggerMock.Object);

        var exception = await Record.ExceptionAsync(() =>
            client.SendInventoryAsync(Guid.NewGuid(), Guid.NewGuid(), 5));

        Assert.Null(exception);
    }

    [Fact]
    public async Task SendInventoryAsync_DoesNotThrow_WhenCircuitIsOpen_CalledMultipleTimes()
    {
        var openCircuit = BuildOpenCircuit();
        var client = new InventoryGrpcClient(openCircuit, _loggerMock.Object);

        for (int i = 0; i < 3; i++)
        {
            var ex = await Record.ExceptionAsync(() =>
                client.SendInventoryAsync(Guid.NewGuid(), Guid.NewGuid(), i + 1));
            Assert.Null(ex);
        }
    }
}
