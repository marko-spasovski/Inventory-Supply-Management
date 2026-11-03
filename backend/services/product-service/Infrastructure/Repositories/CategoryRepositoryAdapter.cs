using Microsoft.EntityFrameworkCore;
using product_service.Application.Mappers;
using product_service.Application.Ports.Out;
using product_service.Domain.Entities;
using product_service.Infrastructure.Persistence;

namespace product_service.Infrastructure.Repositories;

public class CategoryRepositoryAdapter: ICategoryRepositoryPort
{
    private readonly ProductDbContext _context;
    
    public CategoryRepositoryAdapter(ProductDbContext context)
    {
        _context = context;
    }

    public async Task<Category> Save(Category category)
    {
        if (category.Id == Guid.Empty)
        {
            var entity = CategoryMapper.ToEntity(category);
            _context.Categories.Add(entity);
            await _context.SaveChangesAsync();
            return CategoryMapper.ToDomain(entity);
        }
        
        var tracked = await _context.Categories.FindAsync(category.Id);

        if (tracked == null)
        {
            var entity = CategoryMapper.ToEntity(category);
            _context.Categories.Add(entity);
            await _context.SaveChangesAsync();
            return CategoryMapper.ToDomain(entity);
        }
        tracked.Name = category.Name;
        tracked.Description = category.Description;
        
        await _context.SaveChangesAsync();
        return CategoryMapper.ToDomain(tracked);
    }

    public async Task<List<Category>> GetAll()
    {
        var entities = await _context.Categories.ToListAsync();
        
        return entities
            .Select(CategoryMapper.ToDomain)
            .ToList();
    }

    public async Task<Category?> GetById(Guid id)
    {
        var entity = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == id);

        if (entity == null)
        {
            return null;
        }
        
        return CategoryMapper.ToDomain(entity);
    }

    public async Task<Category?> DeleteById(Guid id)
    {
        var entity = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == id);

        if (entity == null)
        {
            return null;
        }
        
        _context.Categories.Remove(entity);
        await _context.SaveChangesAsync();
        
        return CategoryMapper.ToDomain(entity);
    }
    
}