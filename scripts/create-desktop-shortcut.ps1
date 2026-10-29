# Creates "Notes" shortcuts on the Desktop and in the Start menu that open
# release\win-unpacked\Notes.exe from this folder. Safe to run again (it just updates them),
# e.g. after moving the whole Note folder somewhere else.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $root 'release\win-unpacked\Notes.exe'

if (-not (Test-Path $exe)) {
    Write-Host ''
    Write-Host "Notes.exe was not found at:" -ForegroundColor Yellow
    Write-Host "  $exe"
    Write-Host ''
    Write-Host "Build the app first: double-click 'Build App.bat' in $root (or run: npm run package)."
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$targets = @(
    [Environment]::GetFolderPath('Desktop'),
    [Environment]::GetFolderPath('Programs')
)

foreach ($folder in $targets) {
    $link = Join-Path $folder 'Notes.lnk'
    $shortcut = $shell.CreateShortcut($link)
    $shortcut.TargetPath = $exe
    $shortcut.WorkingDirectory = Split-Path -Parent $exe
    $shortcut.IconLocation = "$exe,0"
    $shortcut.Description = 'Notes, to-dos and class calendar'
    $shortcut.Save()
    Write-Host "Created $link"
}

Write-Host ''
Write-Host 'Done. Double-click "Notes" on your Desktop, or search "Notes" in the Start menu.' -ForegroundColor Green
