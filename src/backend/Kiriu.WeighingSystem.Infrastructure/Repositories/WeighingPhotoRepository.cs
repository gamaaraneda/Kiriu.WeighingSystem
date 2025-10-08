using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class WeighingPhotoRepository : IWeighingPhotoRepository
{
    private readonly WeighingDbContext _context;

    public WeighingPhotoRepository(WeighingDbContext context)
    {
        _context = context;
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
