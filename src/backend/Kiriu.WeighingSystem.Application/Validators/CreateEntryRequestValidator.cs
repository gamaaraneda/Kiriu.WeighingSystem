using FluentValidation;
using Kiriu.WeighingSystem.Application.DTOs.Weighing;

namespace Kiriu.WeighingSystem.Application.Validators;

public class CreateEntryRequestValidator : AbstractValidator<CreateEntryRequest>
{
    public CreateEntryRequestValidator()
    {
        RuleFor(x => x.UnitType)
            .NotEmpty()
            .WithMessage("UnitType es requerido")
            .Must(x => x == "client" || x == "provider")
            .WithMessage("UnitType debe ser 'client' o 'provider'");

        RuleFor(x => x.OperationType)
            .NotEmpty()
            .WithMessage("OperationType es requerido")
            .Must(x => x == "entry")
            .WithMessage("OperationType debe ser 'entry'");

        RuleFor(x => x.TipoUnidad)
            .NotEmpty()
            .WithMessage("TipoUnidad es requerido")
            .Must(x => x == "remolque" || x == "contenedor" || x == "doble-remolque")
            .WithMessage("TipoUnidad debe ser 'remolque', 'contenedor' o 'doble-remolque'");

        RuleFor(x => x.TrailerPlate)
            .NotEmpty()
            .WithMessage("TrailerPlate es requerido")
            .MaximumLength(20)
            .WithMessage("TrailerPlate no puede exceder 20 caracteres");

        RuleFor(x => x.Product)
            .NotEmpty()
            .WithMessage("Product es requerido")
            .MaximumLength(100)
            .WithMessage("Product no puede exceder 100 caracteres");

        RuleFor(x => x.ClientProviderName)
            .NotEmpty()
            .WithMessage("ClientProviderName es requerido")
            .MaximumLength(200)
            .WithMessage("ClientProviderName no puede exceder 200 caracteres");

        RuleFor(x => x.EntryWeight)
            .GreaterThan(0)
            .WithMessage("EntryWeight debe ser mayor a 0");

        RuleFor(x => x.Photos.Cargo)
            .NotEmpty()
            .WithMessage("Foto de cargo es requerida");
    }
}