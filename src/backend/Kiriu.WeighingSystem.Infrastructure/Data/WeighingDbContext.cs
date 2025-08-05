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
            entity.Property(e => e.PasswordHash).HasMaxLength(255).IsRequired();
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
    }
} 