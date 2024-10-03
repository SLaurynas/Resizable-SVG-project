using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using System.Text.Json;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableCors("AllowReactApp")]
    public class RectangleController : ControllerBase
    {
        private readonly string _filePath = "data/rectangle.json";

        // GET api/rectangle
        [HttpGet]
        public IActionResult GetRectangle()
        {
            try
            {
                var jsonData = System.IO.File.ReadAllText(_filePath);
                var options = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };
                var rectangle = JsonSerializer.Deserialize<Rectangle>(jsonData, options);

                if (rectangle == null)
                {
                    return NotFound("Rectangle data not found.");
                }

                return Ok(rectangle);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // PUT api/rectangle
        [HttpPut]
        public async Task<IActionResult> UpdateRectangle([FromBody] Rectangle rectangle)
        {
            try
            {
                // Delay 10 seconds
                await Task.Delay(10000);

                // Validation
                if (rectangle.Width > rectangle.Height)
                {
                    return BadRequest("Width cannot exceed height.");
                }

                var options = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = true
                };
                var jsonString = JsonSerializer.Serialize(rectangle, options);
                System.IO.File.WriteAllText(_filePath, jsonString);

                return Ok(rectangle);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
