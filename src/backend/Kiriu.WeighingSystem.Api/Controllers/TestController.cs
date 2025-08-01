using Microsoft.AspNetCore.Mvc;
using Kiriu.WeighingSystem.Application.DTOs;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<string>> Get()
    {
        return Ok(new ApiResponse<string>
        {
            Success = true,
            Data = "Kiriu Weighing System API is running!",
            Message = "API funcionando correctamente"
        });
    }
} 