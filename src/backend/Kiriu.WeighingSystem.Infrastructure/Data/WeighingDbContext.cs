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
    
    // Audit entities
    public DbSet<AuditLog> AuditLogs { get; set; }
    
    // User sessions for concurrent session control
    public DbSet<UserSession> UserSessions { get; set; }
    
    // Folio sequence entity
    public DbSet<FolioSequence> FolioSequences { get; set; }

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
        
        // Audit log configuration
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs", "audit");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.UsuarioId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.NombreUsuario).HasMaxLength(200);
            entity.Property(e => e.Operacion).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Recurso).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RegistroId).HasMaxLength(50);
            entity.Property(e => e.Timestamp).HasColumnType("DATETIME2").IsRequired();
            entity.Property(e => e.Payload).HasColumnType("NVARCHAR(MAX)");
            entity.Property(e => e.IpOrigen).HasMaxLength(45);
            entity.Property(e => e.Resultado).HasMaxLength(20).IsRequired().HasDefaultValue("success");
            entity.Property(e => e.Detalles).HasMaxLength(500);
            entity.Property(e => e.MetodoHttp).HasMaxLength(10);
            entity.Property(e => e.RutaApi).HasMaxLength(200);
            entity.Property(e => e.Dispositivo).HasMaxLength(200);
            
            // Índices para optimizar consultas
            entity.HasIndex(e => e.UsuarioId).HasDatabaseName("IX_AuditLogs_UsuarioId");
            entity.HasIndex(e => e.Recurso).HasDatabaseName("IX_AuditLogs_Recurso");
            entity.HasIndex(e => e.Operacion).HasDatabaseName("IX_AuditLogs_Operacion");
            entity.HasIndex(e => e.Timestamp).HasDatabaseName("IX_AuditLogs_Timestamp");
            entity.HasIndex(e => new { e.UsuarioId, e.Timestamp }).HasDatabaseName("IX_AuditLogs_Usuario_Timestamp");
            entity.HasIndex(e => new { e.Recurso, e.Timestamp }).HasDatabaseName("IX_AuditLogs_Recurso_Timestamp");
            entity.HasIndex(e => e.Dispositivo).HasDatabaseName("IX_AuditLogs_Dispositivo");
        });
        
        // Folio sequence configuration
        modelBuilder.Entity<FolioSequence>(entity =>
        {
            entity.ToTable("FolioSequence", "weighing");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedNever(); // No auto-generate, always 1
            entity.Property(e => e.CurrentSequence).IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnType("DATETIME").IsRequired();
        });
        
        // User session configuration for concurrent session control
        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.ToTable("UserSessions", "defutlt");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TokenJti).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RefreshToken).HasMaxLength(500).IsRequired();
            entity.Property(e => e.DeviceInfo).HasMaxLength(500);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.CreatedAt).HasColumnType("DATETIME").IsRequired();
            entity.Property(e => e.ExpiresAt).HasColumnType("DATETIME").IsRequired();
            entity.Property(e => e.RevokedAt).HasColumnType("DATETIME");
            entity.Property(e => e.IsActive).HasColumnType("bit").IsRequired();
            entity.Property(e => e.RevocationReason).HasMaxLength(200);
            
            entity.HasOne(d => d.Usuario)
                  .WithMany()
                  .HasForeignKey(d => d.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            // Índices para optimizar consultas
            entity.HasIndex(e => e.UserId).HasDatabaseName("IX_UserSessions_UserId");
            entity.HasIndex(e => e.TokenJti).HasDatabaseName("IX_UserSessions_TokenJti");
            entity.HasIndex(e => e.RefreshToken).HasDatabaseName("IX_UserSessions_RefreshToken");
            entity.HasIndex(e => new { e.UserId, e.IsActive }).HasDatabaseName("IX_UserSessions_UserId_IsActive");
        });
    }
} 