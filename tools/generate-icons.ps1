Add-Type -AssemblyName System.Drawing

$extensionRoot = Split-Path -Parent $PSScriptRoot
$iconDirectory = Join-Path $extensionRoot "icons"
New-Item -ItemType Directory -Path $iconDirectory -Force | Out-Null

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

foreach ($size in @(16, 32, 48, 128)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $margin = [Math]::Max(1, $size * 0.04)
  $radius = [Math]::Max(2, $size * 0.23)
  $cardPath = New-RoundedRectanglePath -X $margin -Y $margin -Width ($size - 2 * $margin) -Height ($size - 2 * $margin) -Radius $radius
  $cardBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#F7FAF9"))
  $cardPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#DCE5E3"), [Math]::Max(1, $size * 0.025))
  $graphics.FillPath($cardBrush, $cardPath)
  $graphics.DrawPath($cardPen, $cardPath)

  $highlightPath = New-RoundedRectanglePath -X ($size * 0.16) -Y ($size * 0.4) -Width ($size * 0.68) -Height ($size * 0.2) -Radius ([Math]::Max(1, $size * 0.05))
  $highlightBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#F1E2A1"))
  $graphics.FillPath($highlightBrush, $highlightPath)

  $textPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#5B6B73"), [Math]::Max(1.2, $size * 0.055))
  $textPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $textPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($textPen, $size * 0.22, $size * 0.3, $size * 0.72, $size * 0.3)
  $graphics.DrawLine($textPen, $size * 0.22, $size * 0.5, $size * 0.78, $size * 0.5)
  $graphics.DrawLine($textPen, $size * 0.27, $size * 0.69, $size * 0.7, $size * 0.69)

  $underlinePen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#789DB1"), [Math]::Max(1.2, $size * 0.045))
  $underlinePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $underlinePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawBezier($underlinePen, $size * 0.23, $size * 0.78, $size * 0.4, $size * 0.75, $size * 0.62, $size * 0.81, $size * 0.77, $size * 0.77)

  $outputPath = Join-Path $iconDirectory "icon-$size.png"
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $underlinePen.Dispose()
  $textPen.Dispose()
  $highlightBrush.Dispose()
  $highlightPath.Dispose()
  $cardPen.Dispose()
  $cardBrush.Dispose()
  $cardPath.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Output "Generated extension icons in $iconDirectory"
