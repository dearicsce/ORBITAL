param([int]$Port = 19381, [string]$Tag = 'MissionEvidence')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$evidence = Join-Path $root 'Verification/MissionExperiments/Interactions'
$runName = 'evidence-interactions-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
if (Test-Path -LiteralPath $evidence) {
    $evidence += '-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
}
New-Item -ItemType Directory -Force $evidence | Out-Null
$env:ORBITAL_TEST_PORT = "$Port"
$env:ORBITAL_TEST_ARTIFACTS = $evidence
$results = [ordered]@{}
function Run-Case([string]$case) {
    & node Tools/Check-EmbeddedCampaign.mjs $case | Out-Host
    $results[$case] = $LASTEXITCODE
}
Push-Location $root
try {
    $run = & Tools/Start-CampaignHostCheck.ps1 -Port $Port -Tag $Tag -RunName $runName -IsolatedExports
    $run | ConvertTo-Json | Set-Content "$evidence/launch.json"
    $env:ORBITAL_TEST_EXPORT_DIR = Join-Path $run.Profile 'Exports'
    Run-Case learning
    Run-Case roundtrip
    if ($results.roundtrip -eq 0) { Run-Case workshop-stress }
    Run-Case pause-floodwatch
    $owned = Get-Process -Id $run.Id -ErrorAction SilentlyContinue
    if ($results['pause-floodwatch'] -ne 0) { throw 'Pause checkpoint failed.' }
    if ($owned -and !$owned.WaitForExit(15000)) { throw 'Paused verification player stayed open.' }
    $restart = & Tools/Start-CampaignHostCheck.ps1 -Port $Port -Tag $Tag -RunName $runName -IsolatedExports -WaitPortSeconds 30
    $restart | ConvertTo-Json | Set-Content "$evidence/restart.json"
    Run-Case resume-floodwatch
    Run-Case mission-evidence-demo
    Run-Case layout
    Run-Case quit
} finally {
    $results | ConvertTo-Json | Set-Content "$evidence/exit-codes.json"
    Pop-Location
}
if ($results.Values -contains 1) { exit 1 }
