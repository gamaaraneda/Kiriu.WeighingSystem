using FluentValidation;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Application.Constants;

namespace Kiriu.WeighingSystem.Application.Validators;

public class CreateUsuarioRequestValidator : AbstractValidator<CreateUsuarioRequest>
{
    public CreateUsuarioRequestValidator()
    {
        RuleFor(x => x.Nombre)
            .NotEmpty().WithMessage("El nombre es requerido")
            .MaximumLength(ValidationConstants.Usuario.NombreMaxLength).WithMessage($"El nombre no puede exceder {ValidationConstants.Usuario.NombreMaxLength} caracteres")
            .MinimumLength(ValidationConstants.Usuario.NombreMinLength).WithMessage($"El nombre debe tener al menos {ValidationConstants.Usuario.NombreMinLength} caracteres");

        RuleFor(x => x.Apellidos)
            .MaximumLength(ValidationConstants.Usuario.ApellidosMaxLength).WithMessage($"Los apellidos no pueden exceder {ValidationConstants.Usuario.ApellidosMaxLength} caracteres")
            .When(x => !string.IsNullOrEmpty(x.Apellidos));

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("El email es requerido")
            .EmailAddress().WithMessage("El formato del email no es válido")
            .MaximumLength(ValidationConstants.Usuario.EmailMaxLength).WithMessage($"El email no puede exceder {ValidationConstants.Usuario.EmailMaxLength} caracteres");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("La contraseña es requerida")
            .MinimumLength(ValidationConstants.Usuario.PasswordMinLength).WithMessage($"La contraseña debe tener al menos {ValidationConstants.Usuario.PasswordMinLength} caracteres")
            .MaximumLength(ValidationConstants.Usuario.PasswordMaxLength).WithMessage($"La contraseña no puede exceder {ValidationConstants.Usuario.PasswordMaxLength} caracteres")
            .Matches(ValidationConstants.Usuario.PasswordRegex)
            .WithMessage("La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un carácter especial");

        RuleFor(x => x.RolId)
            .NotEmpty().WithMessage("El ID del rol es requerido");
    }
} 