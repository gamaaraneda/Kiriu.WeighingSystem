using FluentValidation;
using Kiriu.WeighingSystem.Application.DTOs.Weighing;

namespace Kiriu.WeighingSystem.Application.Validators;

public class CreateExitRequestValidator : AbstractValidator<CreateExitRequest>
{
    public CreateExitRequestValidator()
    {
        RuleFor(x => x.Folio)
            .NotEmpty()
            .WithMessage("Folio es requerido")
            .MaximumLength(50)
            .WithMessage("Folio no puede exceder 50 caracteres");

        RuleFor(x => x.PesoBruto)
            .GreaterThan(0)
            .WithMessage("PesoBruto debe ser mayor a 0");

        RuleFor(x => x.PesoTara)
            .GreaterThanOrEqualTo(0)
            .WithMessage("PesoTara no puede ser negativo");

        RuleFor(x => x.PesoNeto)
            .GreaterThanOrEqualTo(0)
            .WithMessage("PesoNeto no puede ser negativo");

        RuleFor(x => x.PlacaTrailer)
            .NotEmpty()
            .WithMessage("PlacaTrailer es requerido")
            .MaximumLength(20)
            .WithMessage("PlacaTrailer no puede exceder 20 caracteres");

        RuleFor(x => x.Estado)
            .NotEmpty()
            .WithMessage("Estado es requerido")
            .Must(x => x == "SALIDA_REGISTRADA")
            .WithMessage("Estado debe ser 'SALIDA_REGISTRADA'");

        RuleFor(x => x.TipoUnidad)
            .NotEmpty()
            .WithMessage("TipoUnidad es requerido")
            .Must(x => x == "remolque" || x == "contenedor" || x == "doble-remolque")
            .WithMessage("TipoUnidad debe ser 'remolque', 'contenedor' o 'doble-remolque'");

        RuleFor(x => x.Fotos.CargoState)
            .NotEmpty()
            .WithMessage("Foto del estado de cargo es requerida");
    }
}