using Microsoft.EntityFrameworkCore;
using product_service.Application.Mappers;
using product_service.Application.Ports.Out;
using product_service.Domain.Entities;
using product_service.Infrastructure.Entities;
using product_service.Infrastructure.Persistence;

namespace product_service.Infrastructure.Repositories;

public class ProductRepositoryAdapter: IProductRepositoryPort
{
    private readonly ProductDbContext _context;
    
    public ProductRepositoryAdapter(ProductDbContext context)
    {
        _context = context;
    }
    
    public async Task<Product> Save(Product product)
    {
        if (product.Id == Guid.Empty)
        {
            var entity = ProductMapper.ToEntity(product);
            _context.Products.Add(entity);
            await _context.SaveChangesAsync();
            return ProductMapper.ToDomain(entity);
        }
        
        var tracked = await _context.Products.FindAsync(product.Id);

        if (tracked == null)
        {
            var entity = ProductMapper.ToEntity(product);
            _context.Products.Add(entity);
            await _context.SaveChangesAsync();
            return ProductMapper.ToDomain(entity);
        }
        tracked.Name = product.Name;
        tracked.Description = product.Description;
        
        await _context.SaveChangesAsync();
        return ProductMapper.ToDomain(tracked);
    }

    public async Task<List<Product>> GetAll()
    {
        var products = await _context.Products.ToListAsync();
        return products
            .Select(ProductMapper.ToDomain)
            .ToList();
    }

    public async Task<Product?> GetById(Guid id)
    {
        var product = await _context.Products.FindAsync(id);
        
        if (product == null)
        {
            return null;
        }
        
        return ProductMapper.ToDomain(product);
    }

    public async Task<Product?> GetBySku(string sku)
    {
        // Case-sensitive exact match. SKU is treated as a business identifier.
        var entity = await _context.Products.FirstOrDefaultAsync(p => p.SKU == sku);
        return entity == null ? null : ProductMapper.ToDomain(entity);
    }

    public async Task<Product?> DeleteById(Guid id)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            return null;
        }
        
        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return ProductMapper.ToDomain(product);
    }
    
    public async Task<IEnumerable<Product>> GetByFilterAsync(Guid? categoryId = null, string? name = null)
    {
        IQueryable<ProductEntity> query = _context.Products;

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);

        if (!string.IsNullOrEmpty(name))
            query = query.Where(p => p.Name.Contains(name));

        var entities = await query.ToListAsync();
        
        return entities
            .Select(ProductMapper.ToDomain)
            .ToList();
    }
}