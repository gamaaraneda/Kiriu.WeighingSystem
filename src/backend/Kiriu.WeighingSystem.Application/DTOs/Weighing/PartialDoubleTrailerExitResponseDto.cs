namespace Kiriu.WeighingSystem.Application.DTOs.Weighing;

/// <summary>
/// Response para salida parcial de doble remolque (solo remolque 1 registrado).
/// </summary>
public class PartialDoubleTrailerExitResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Folio { get; set; } = string.Empty;
    public string TrailerPlaca { get; set; } = string.Empty;
    public RemolqueExitResponseDto Remolque1 { get; set; } = new();
    public DateTime FechaSalidaR1 { get; set; }
    public string UsuarioRegistroSalidaR1 { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "SALIDA_PARCIAL_R1"
    public string UnitType { get; set; } = string.Empty;
    public string Product { get; set; } = string.Empty;
    public string ClientProviderName { get; set; } = string.Empty;
    /// <summary>Placa del remolque 2 (para mostrar en modo continue).</summary>
    public string PlacaRemolque2 { get; set; } = string.Empty;
}

public class RemolqueExitResponseDto
{
    public int Numero { get; set; }
    public string Placa { get; set; } = string.Empty;
    public decimal PesoBrutoEntrada { get; set; }
    public decimal PesoTaraSalida { get; set; }
}
