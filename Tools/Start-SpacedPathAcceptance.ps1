param([int]$Port=19515)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$record=Join-Path $root 'Verification/UsabilityRelease-2026-11-11'
$candidate=Join-Path $record 'Candidate Player'
$alias=$candidate
if(!(Test-Path -LiteralPath (Join-Path $candidate 'ORBITAL.exe'))){throw 'Canonical spaced-path candidate is missing'}
$acceptanceProfile=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'ORBITAL/UsabilityRelease-2026-11-11/Acceptance'))
New-Item -ItemType Directory -Force $acceptanceProfile | Out-Null
$env:ORBITAL_PROFILE_DIR=$acceptanceProfile
$env:ORBITAL_EXPORT_DIR=Join-Path $acceptanceProfile 'Exports'
$env:ORBITAL_VERIFY_METRICS='1'
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=$Port --remote-debugging-address=127.0.0.1"
$exe=Join-Path $alias 'ORBITAL.exe'
$stamp=[DateTime]::UtcNow
$p=Start-Process -FilePath $exe -ArgumentList '-logFile',('"'+(Join-Path $record 'spaced-path-player.log')+'"') -WindowStyle Normal -PassThru
[pscustomobject]@{pid=$p.Id;player=$exe;physicalCandidate=$candidate;profile=$acceptanceProfile;exports=$env:ORBITAL_EXPORT_DIR;port=$Port;startedUtc=$stamp.ToString('o');method='Canonical player in ordinary Candidate Player directory; no secondary player copy';packagedUiManifestSha256=(Get-FileHash -LiteralPath (Join-Path $candidate 'ORBITAL_Data/StreamingAssets/WebUI/dependency-manifest.json')).Hash.ToLowerInvariant()} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $record 'spaced-path-launch.json')
