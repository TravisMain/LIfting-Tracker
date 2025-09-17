Add-Type -AssemblyName System.Drawing

$imagePath = "c:\Users\travism\source\repos\LIfting Tracker\icons\icon.jpg"
$outputDir = "c:\Users\travism\source\repos\LIfting Tracker\icons"

# Load the image
$image = [System.Drawing.Image]::FromFile($imagePath)

# Function to resize and save
function Resize-Image {
    param (
        [System.Drawing.Image]$img,
        [int]$width,
        [int]$height,
        [string]$outputPath
    )
    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($img, 0, 0, $width, $height)
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

# Create 192x192
Resize-Image -img $image -width 192 -height 192 -outputPath "$outputDir\icon-192.png"

# Create 512x512
Resize-Image -img $image -width 512 -height 512 -outputPath "$outputDir\icon-512.png"

# For maskable, add padding (simple way: resize to fit in center with white background)
function Create-Maskable {
    param (
        [System.Drawing.Image]$img,
        [int]$size,
        [string]$outputPath
    )
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::White)  # White background for maskable
    $scale = [math]::Min($size / $img.Width, $size / $img.Height)
    $newWidth = [int]($img.Width * $scale)
    $newHeight = [int]($img.Height * $scale)
    $x = ($size - $newWidth) / 2
    $y = ($size - $newHeight) / 2
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($img, $x, $y, $newWidth, $newHeight)
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

Create-Maskable -img $image -size 192 -outputPath "$outputDir\maskable-192.png"
Create-Maskable -img $image -size 512 -outputPath "$outputDir\maskable-512.png"

$image.Dispose()