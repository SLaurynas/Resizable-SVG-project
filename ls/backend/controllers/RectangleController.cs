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
                await Task.Delay(10000);

                if (rectangle == null)
                {
                    return BadRequest("The rectangle data is required.");
                }

                // Read the current data to get the SVG dimensions
                var currentJsonData = System.IO.File.ReadAllText(_filePath);
                var currentRectangle = JsonSerializer.Deserialize<Rectangle>(currentJsonData, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                if (currentRectangle == null)
                {
                    return BadRequest("Could not read current rectangle data.");
                }

                // Use the SVG dimensions from the current data
                rectangle.SvgWidth = currentRectangle.SvgWidth;
                rectangle.SvgHeight = currentRectangle.SvgHeight;

                // Enforce boundaries
                rectangle.Width = Math.Max(1, Math.Min(rectangle.Width, rectangle.SvgWidth - rectangle.X));
                rectangle.Height = Math.Max(1, Math.Min(rectangle.Height, rectangle.SvgHeight - rectangle.Y));
                rectangle.X = Math.Max(0, Math.Min(rectangle.X, rectangle.SvgWidth - rectangle.Width));
                rectangle.Y = Math.Max(0, Math.Min(rectangle.Y, rectangle.SvgHeight - rectangle.Height));

                // Enforce width cannot exceed height
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
