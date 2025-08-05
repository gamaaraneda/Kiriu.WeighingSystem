namespace Kiriu.WeighingSystem.Application.Constants;

public static class ValidationConstants
{
    public static class Usuario
    {
        public const int NombreMaxLength = 100;
        public const int NombreMinLength = 2;
        public const int ApellidosMaxLength = 100;
        public const int EmailMaxLength = 255;
        public const int PasswordMaxLength = 100;
        public const int PasswordMinLength = 8;
        public const string PasswordRegex = @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]";
    }

    public static class Rol
    {
        public const int NombreMaxLength = 50;
        public const int DescripcionMaxLength = 255;
    }

    public static class Jwt
    {
        public const int DefaultExpirationMinutes = 60;
        public const int DefaultRefreshTokenExpirationDays = 7;
    }
} 