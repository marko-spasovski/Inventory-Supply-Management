namespace order_service.Domain.Exceptions;

/// <summary>The requested status change is not allowed from the order's current status (409).</summary>
public class InvalidStatusTransitionException(string from, string to)
    : Exception($"An order cannot go from {from} to {to}.");

/// <summary>The order does not exist (404).</summary>
public class OrderNotFoundException(Guid id) : Exception($"Order {id} not found.");

/// <summary>inventory-service did not confirm the stock change; nothing was saved (503).</summary>
public class InventoryUnavailableException(string reason) : Exception($"Inventory was not updated: {reason}");
