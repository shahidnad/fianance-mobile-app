Add-Type -AssemblyName System.Drawing

$iconIn = "d:\androidapp\fiananceapp\assets\images\icon.jpg"
$iconOut = "d:\androidapp\fiananceapp\assets\images\icon.png"
$img1 = [System.Drawing.Image]::FromFile($iconIn)
$img1.Save($iconOut, [System.Drawing.Imaging.ImageFormat]::Png)
$img1.Dispose()

$splashIn = "d:\androidapp\fiananceapp\assets\images\splash-icon.jpg"
$splashOut = "d:\androidapp\fiananceapp\assets\images\splash-icon.png"
$img2 = [System.Drawing.Image]::FromFile($splashIn)
$img2.Save($splashOut, [System.Drawing.Imaging.ImageFormat]::Png)
$img2.Dispose()

$fgIn = "d:\androidapp\fiananceapp\assets\images\android-icon-foreground.jpg"
$fgOut = "d:\androidapp\fiananceapp\assets\images\android-icon-foreground.png"
$img3 = [System.Drawing.Image]::FromFile($fgIn)
$img3.Save($fgOut, [System.Drawing.Imaging.ImageFormat]::Png)
$img3.Dispose()
