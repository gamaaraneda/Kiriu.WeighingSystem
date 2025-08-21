using Microsoft.EntityFrameworkCore;
using System.Globalization;
using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Infrastructure.Data;

public class WeighingDbContext : DbContext
{
    public WeighingDbContext(DbContextOptions<WeighingDbContext> options) : base(options)
{
}

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Rol> Roles { get; set; }
    public DbSet<Modulo> Modulos { get; set; }
    public DbSet<Permiso> Permisos { get; set; }
    public DbSet<ModuloPermiso> ModuloPermisos { get; set; }
    public DbSet<RolePermiso> RolePermisos { get; set; }
    
    // Weighing entities
    public DbSet<WeighingOperation> WeighingOperations { get; set; }
    public DbSet<WeighingPhoto> WeighingPhotos { get; set; }
    public DbSet<WeighingRemolque> WeighingRemolques { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // Configurar SQL Server para usar cultura invariante
        optionsBuilder.UseSqlServer(options => 
        {
            options.EnableRetryOnFailure();
            options.CommandTimeout(30);
        });
        
        base.OnConfiguring(optionsBuilder);
    }

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.ToTable("Usuarios", "defutlt");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Apellidos).HasMaxLength(100);
            entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(e => e.FechaCreacion).HasColumnType("DATETIME").IsRequired();
            entity.Property(e => e.UltimoAcceso).HasColumnType("DATETIME");
            entity.Property(e => e.Activo).HasColumnType("bit").IsRequired();
            
            entity.HasOne(d => d.Rol)
                  .WithMany(p => p.Usuarios)
                  .HasForeignKey(d => d.RolId);
        });
        
        modelBuilder.Entity<Rol>(entity =>
        {
            entity.ToTable("Roles", "defutlt");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Descripcion).HasMaxLength(255);
            entity.Property(e => e.FechaCreacion).HasColumnType("DATETIME").IsRequired();
            entity.Property(e => e.Activo).HasColumnType("bit").IsRequired();
        });
        
        modelBuilder.Entity<Modulo>(entity =>
        {
            entity.ToTable("Modulos", "defutlt");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Descripcion).HasMaxLength(255);
            entity.Property(e => e.Icono).HasMaxLength(50);
            entity.Property(e => e.Orden).IsRequired();
            entity.Property(e => e.Activo).HasColumnType("bit").IsRequired();
        });
        
        modelBuilder.Entity<Permiso>(entity =>
        {
            entity.ToTable("Permisos", "defutlt");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Descripcion).HasMaxLength(255);
            entity.Property(e => e.Tipo).HasMaxLength(20).IsRequired();
            entity.Property(e => e.FechaCreacion).HasColumnType("DATETIME").IsRequired();
            entity.Property(e => e.Activo).HasColumnType("bit").IsRequired();
        });
        
        modelBuilder.Entity<ModuloPermiso>(entity =>
        {
            entity.ToTable("ModuloPermisos", "defutlt");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Codigo).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Descripcion).HasMaxLength(255);
            
            entity.HasOne(d => d.Modulo)
                  .WithMany()
                  .HasForeignKey(d => d.ModuloId);
                  
            entity.HasOne(d => d.Permiso)
                  .WithMany()
                  .HasForeignKey(d => d.PermisoId);
        });
        
        modelBuilder.Entity<RolePermiso>(entity =>
        {
            entity.ToTable("RolePermisos", "defutlt");
            entity.HasKey(e => new { e.RolId, e.ModuloPermisoId });
            entity.Property(e => e.FechaAsignacion).HasColumnType("DATETIME").IsRequired();
            
            entity.HasOne(d => d.Rol)
                  .WithMany(p => p.RolePermisos)
                  .HasForeignKey(d => d.RolId);
                  
            entity.HasOne(d => d.ModuloPermiso)
                  .WithMany()
                  .HasForeignKey(d => d.ModuloPermisoId);
        });
        
        // Weighing entities configuration
        modelBuilder.Entity<WeighingOperation>(entity =>
        {
            entity.ToTable("WeighingOperations", "weighing", table =>
  {
      // Deshabilita la cláusula OUTPUT para tablas con triggers
      table.HasTrigger("TR_WeighingOperations_UpdatedAt");
  });
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Folio).HasMaxLength(50).IsRequired();
            entity.Property(e => e.UnitType).HasMaxLength(20).IsRequired();
            entity.Property(e => e.OperationType).HasMaxLength(20).IsRequired();
            entity.Property(e => e.TrailerPlate).HasMaxLength(20);
            entity.Property(e => e.TrailerPlate2).HasMaxLength(20);
            entity.Property(e => e.TrailerPlateContenedor).HasMaxLength(20);
            entity.Property(e => e.RemolquePlateContenedor).HasMaxLength(20);
            entity.Property(e => e.PlacaRemolque1).HasMaxLength(20);
            entity.Property(e => e.PlacaRemolque2).HasMaxLength(20);
            entity.Property(e => e.Product).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ClientProviderName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.ClientProviderRfc).HasMaxLength(50);
            entity.Property(e => e.EntryWeight).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ExitWeight).HasColumnType("decimal(18,2)");
            entity.Property(e => e.NetWeight).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Status).HasMaxLength(30).IsRequired();
            entity.Property(e => e.TipoUnidad).HasMaxLength(30).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnType("DATETIME").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnType("DATETIME").IsRequired();
            entity.Property(e => e.EntryDate).HasColumnType("DATETIME");
            entity.Property(e => e.ExitDate).HasColumnType("DATETIME");
            
            entity.HasIndex(e => e.Folio).IsUnique();
            entity.HasIndex(e => e.TrailerPlate);
            entity.HasIndex(e => e.Status);
        });
        
        modelBuilder.Entity<WeighingPhoto>(entity =>
        {
            entity.ToTable("WeighingPhotos", "weighing", table =>
  {
      // Deshabilita la cláusula OUTPUT para tablas con triggers
      table.HasTrigger("TR_WeighingPhotos_UpdatedAt");
  });
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PhotoType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.PhotoUrl).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(200);
            entity.Property(e => e.CreatedAt).HasColumnType("DATETIME").IsRequired();
            
            entity.HasOne(d => d.WeighingOperation)
                  .WithMany(p => p.Photos)
                  .HasForeignKey(d => d.WeighingOperationId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
        
        modelBuilder.Entity<WeighingRemolque>(entity =>
        {
            entity.ToTable("WeighingRemolques", "weighing", table =>
  {
      // Deshabilita la cláusula OUTPUT para tablas con triggers
      table.HasTrigger("TR_WeighingRemolques_UpdatedAt");
  });
            
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Numero).IsRequired();
            entity.Property(e => e.Placa).HasMaxLength(20).IsRequired();
            entity.Property(e => e.PesoBruto).HasColumnType("decimal(18,2)").IsRequired();
            entity.Property(e => e.PesoTara).HasColumnType("decimal(18,2)");
            entity.Property(e => e.PesoCapturado).HasColumnType("bit").IsRequired();
            entity.Property(e => e.FotosCapturadas).HasColumnType("bit").IsRequired();
            entity.Property(e => e.FotoCargaCapturada).HasColumnType("bit").IsRequired();
            entity.Property(e => e.FotoPlacaCapturada).HasColumnType("bit").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnType("DATETIME").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnType("DATETIME").IsRequired();
            
            entity.HasOne(d => d.WeighingOperation)
                  .WithMany(p => p.Remolques)
                  .HasForeignKey(d => d.WeighingOperationId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
} 