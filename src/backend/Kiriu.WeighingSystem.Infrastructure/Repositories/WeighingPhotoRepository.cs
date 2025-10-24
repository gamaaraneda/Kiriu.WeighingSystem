using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;
using Kiriu.WeighingSystem.Infrastructure.Configuration;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class WeighingPhotoRepository : IWeighingPhotoRepository
{
    private readonly WeighingDbContext _context;
    private readonly PhotoSettings _photoSettings;

    public WeighingPhotoRepository(WeighingDbContext context, IOptions<PhotoSettings> photoSettings)
    {
        _context = context;
        _photoSettings = photoSettings.Value;
    }

    public async Task<WeighingPhoto?> GetByIdAsync(Guid id)
    {
        return await _context.WeighingPhotos
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<WeighingPhoto>> GetByOperationIdAsync(Guid operationId)
    {
        return await _context.WeighingPhotos
            .AsNoTracking()
            .Where(p => p.WeighingOperationId == operationId)
            .ToListAsync();
    }

    public async Task<WeighingPhoto> AddAsync(WeighingPhoto photo)
    {
        await _context.WeighingPhotos.AddAsync(photo);
        await _context.SaveChangesAsync();
        return photo;
    }

    public async Task UpdateAsync(WeighingPhoto photo)
    {
        _context.WeighingPhotos.Update(photo);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var photo = await _context.WeighingPhotos.FindAsync(id);
        if (photo != null)
        {
            _context.WeighingPhotos.Remove(photo);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<WeighingPhoto?> GetOrphanPhotoByUrlAsync(string photoUrl)
    {
        return await _context.WeighingPhotos
            .FirstOrDefaultAsync(p => p.PhotoUrl == photoUrl && p.WeighingOperationId == null);
    }

    public async Task<WeighingPhoto?> GetLatestOrphanPhotoByTypeAsync(string photoType)
    {
        // Solo buscar fotos recientes para evitar usar fotos viejas
        // El tiempo máximo se configura en appsettings.json (PhotoSettings:OrphanPhotoMaxAgeMinutes)
        var cutoffTime = DateTime.UtcNow.AddMinutes(-_photoSettings.OrphanPhotoMaxAgeMinutes);

        return await _context.WeighingPhotos
            .Where(p => p.PhotoType == photoType
                     && p.WeighingOperationId == null
                     && p.CreatedAt >= cutoffTime)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task LinkOrphanPhotoToOperationAsync(Guid photoId, Guid operationId)
    {
        var photo = await _context.WeighingPhotos.FindAsync(photoId);
        if (photo != null && photo.WeighingOperationId == null)
        {
            photo.WeighingOperationId = operationId;
            await _context.SaveChangesAsync();
        }
    }
}
