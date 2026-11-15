param(
    [int]$Port = 19332,
    [string]$Tag = 'Final',
    [ValidateSet('Baseline','Candidate')][string[]]$Builds = @('Baseline','Candidate'),
    [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$RunName = ('perf-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$record = Join-Path $root 'Verification/Campaign-2026-11-09'
$name = $RunName
Push-Location $root
try {
    foreach ($build in $Builds) {
        $run = & "$PSScriptRoot/Start-CampaignHostCheck.ps1" -Build $build -Tag $Tag -Port $Port -RunName $name -WaitPortSeconds 30
        $evidence = Join-Path $record "$build-$name"
        New-Item -ItemType Directory -Force $evidence | Out-Null
        $run | ConvertTo-Json | Set-Content -LiteralPath "$evidence/launch.json"
        $sample = Start-Job -FilePath "$PSScriptRoot/Sample-CampaignProcesses.ps1" -ArgumentList $run.Id,"$evidence/processes.csv",180
        $env:ORBITAL_TEST_PORT = "$Port"
        $env:ORBITAL_TEST_ARTIFACTS = $evidence
        & node Tools/Check-EmbeddedCampaign.mjs performance
        $result = $LASTEXITCODE
        & node Tools/Check-EmbeddedCampaign.mjs quit
        $owned = Get-Process -Id $run.Id -ErrorAction SilentlyContinue
        if ($owned -and !$owned.WaitForExit(15000)) { throw "$build test player did not close." }
        Receive-Job -Job $sample -Wait -AutoRemoveJob
        if ($result -ne 0) { Write-Warning "$build measurement ended early. See $evidence." }
        $warm = & "$PSScriptRoot/Start-CampaignHostCheck.ps1" -Build $build -Tag $Tag -Port $Port -RunName $name -WaitPortSeconds 30
        $warm | ConvertTo-Json | Set-Content -LiteralPath "$evidence/warm-launch.json"
        & node Tools/Check-EmbeddedCampaign.mjs startup
        & node Tools/Check-EmbeddedCampaign.mjs quit
        $owned = Get-Process -Id $warm.Id -ErrorAction SilentlyContinue
        if ($owned -and !$owned.WaitForExit(15000)) { throw "$build warm test player did not close." }
    }
} finally { Pop-Location }
