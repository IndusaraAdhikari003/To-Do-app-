$WshShell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcut = $WshShell.CreateShortcut((Join-Path $desktop "DayBloom.lnk"))
$shortcut.TargetPath = Join-Path $PSScriptRoot "runtime\DayBloom.exe"
$shortcut.WorkingDirectory = Join-Path $PSScriptRoot "runtime"
$shortcut.IconLocation = Join-Path $PSScriptRoot "DayBloom.ico"
$shortcut.Description = "DayBloom - Plan your day beautifully"
$shortcut.Save()
Write-Host "DayBloom desktop shortcut created."
