param([int]$Port = 19331, [string]$Tag = 'Final')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$name = 'interactions-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$artifact = Join-Path $root "Verification/Campaign-2026-11-09/$name"
New-Item -ItemType Directory -Force $artifact | Out-Null
$env:ORBITAL_TEST_PORT = "$Port"
$env:ORBITAL_TEST_ARTIFACTS = $artifact
function Run-Case([string]$case) {
    & node Tools/Check-EmbeddedCampaign.mjs $case
    if ($LASTEXITCODE -ne 0) { throw "Host check failed: $case. See $artifact." }
}
Push-Location $root
try {
    $run = & "$PSScriptRoot/Start-CampaignHostCheck.ps1" -Tag $Tag -Port $Port -RunName $name -IsolatedExports
    $run | ConvertTo-Json | Set-Content -LiteralPath "$artifact/launch.json"
    $env:ORBITAL_TEST_EXPORT_DIR = Join-Path $run.Profile 'Exports'
    Run-Case learning
    Run-Case roundtrip
    Run-Case workshop-stress
    Run-Case pause-floodwatch
    $player = Get-Process -Id $run.Id -ErrorAction SilentlyContinue
    if ($player -and !$player.WaitForExit(15000)) { throw 'The paused verification player did not close.' }
    $restart = & "$PSScriptRoot/Start-CampaignHostCheck.ps1" -Tag $Tag -Port $Port -RunName $name -IsolatedExports -WaitPortSeconds 30
    $restart | ConvertTo-Json | Set-Content -LiteralPath "$artifact/restart.json"
    Run-Case resume-floodwatch
    Run-Case floodwatch-failure
    Run-Case corrupt-campaign
    Run-Case layout
    & node Tools/Check-EmbeddedCampaign.mjs quit
} finally { Pop-Location }
