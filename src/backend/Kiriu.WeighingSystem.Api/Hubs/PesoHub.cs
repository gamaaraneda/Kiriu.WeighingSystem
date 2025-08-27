using Microsoft.AspNetCore.SignalR;

namespace Kiriu.WeighingSystem.Api.Hubs;

public class PesoHub : Hub
{
    private readonly ILogger<PesoHub> _logger;

    public PesoHub(ILogger<PesoHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Cliente conectado: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Cliente desconectado: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Cliente {ConnectionId} se unió al grupo {GroupName}", Context.ConnectionId, groupName);
    }

    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Cliente {ConnectionId} salió del grupo {GroupName}", Context.ConnectionId, groupName);
    }
}