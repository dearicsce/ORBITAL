param([string]$BackupName = 'LaunchRepair-2026-11-10')
$ErrorActionPreference = 'Stop'
if ($BackupName -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Use a simple backup name.' }
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'Assets/StreamingAssets/WebUI'
$target = Join-Path $root 'Build-Display/ORBITAL_Data/StreamingAssets/WebUI'
$backup = Join-Path $root "Verification/$BackupName/PreviousWebUI"
if (!(Test-Path -LiteralPath $target)) { throw 'The deployed WebUI folder is missing.' }
$changes = @()
foreach ($file in Get-ChildItem -LiteralPath $source -Recurse -File) {
    if ($file.Extension -eq '.meta') { continue }
    $relative = [IO.Path]::GetRelativePath($source, $file.FullName)
    $destination = Join-Path $target $relative
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    $before = if (Test-Path -LiteralPath $destination) { (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash } else { $null }
    if ($hash -eq $before) { continue }
    if ($before) {
        $saved = Join-Path $backup $relative
        if (Test-Path -LiteralPath $saved) { throw "Backup already exists: $saved" }
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $saved) | Out-Null
        Copy-Item -LiteralPath $destination -Destination $saved
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
    if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne $hash) { throw "Copy verification failed: $relative" }
    $changes += [pscustomobject]@{ file=$relative; previousSha256=$before; deployedSha256=$hash }
}
New-Item -ItemType Directory -Force -Path (Join-Path $root "Verification/$BackupName") | Out-Null
$changes | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $root "Verification/$BackupName/deployment.json")
Write-Output "Deployed and hash-verified $($changes.Count) changed files. Previous files are in $backup."
