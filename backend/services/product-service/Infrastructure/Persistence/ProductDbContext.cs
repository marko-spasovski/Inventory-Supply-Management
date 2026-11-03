using Microsoft.EntityFrameworkCore;
using product_service.Infrastructure.Entities;

namespace product_service.Infrastructure.Persistence;

public class ProductDbContext: DbContext
{
    public ProductDbContext(DbContextOptions<ProductDbContext> options) 
        : base(options){}
    
    public DbSet<ProductEntity> Products => Set<ProductEntity>();
    public DbSet<CategoryEntity> Categories => Set<CategoryEntity>();
}