param(
 [string]$Player='Verification/UsabilityRelease-2026-11-11/Candidate Player/ORBITAL.exe',
 [string]$Run='Verification/UsabilityRelease-2026-11-11/Host',
 [int]$Port=19512,
 [ValidateRange(0,60)][int]$WaitPortSeconds=0,
 [string]$ProfileDirectory=''
)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$exe=[IO.Path]::GetFullPath((Join-Path $root $Player))
$runPath=[IO.Path]::GetFullPath((Join-Path $root $Run))
if(!$runPath.StartsWith($root+'\Verification\',[StringComparison]::OrdinalIgnoreCase)){throw 'Test runs must be owned under Verification.'}
if(!(Test-Path -LiteralPath $exe)){throw "Player missing: $exe"}
$portDeadline=[DateTime]::UtcNow.AddSeconds($WaitPortSeconds)
while(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue){
 if([DateTime]::UtcNow -ge $portDeadline){throw "Port $Port is already used"}
 Start-Sleep -Milliseconds 250
}
New-Item -ItemType Directory -Force $runPath | Out-Null
$ownedProfilePath=if($ProfileDirectory){[IO.Path]::GetFullPath((Join-Path $root $ProfileDirectory))}else{Join-Path $runPath 'Profile'}
if(!$ownedProfilePath.StartsWith($root+'\Verification\',[StringComparison]::OrdinalIgnoreCase)){throw 'Shared compatibility-test profiles must remain inside Verification'}
$env:ORBITAL_PROFILE_DIR=$ownedProfilePath
$env:ORBITAL_EXPORT_DIR=Join-Path $ownedProfilePath 'Exports'
$env:ORBITAL_VERIFY_METRICS='1'
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=$Port --remote-debugging-address=127.0.0.1"
Remove-Item Env:ORBITAL_WEB_UI -ErrorAction SilentlyContinue
$started=[DateTime]::UtcNow
$p=Start-Process -FilePath $exe -WorkingDirectory (Split-Path -Parent $exe) -ArgumentList '-logFile',(Join-Path $runPath 'player.log') -PassThru
$package=Join-Path (Split-Path -Parent $exe) 'ORBITAL_Data/StreamingAssets/WebUI/dependency-manifest.json'
$identity=[pscustomobject]@{pid=$p.Id;player=$exe;run=$runPath;profile=$env:ORBITAL_PROFILE_DIR;exports=$env:ORBITAL_EXPORT_DIR;port=$Port;startedUtc=$started.ToString('o');executableSha256=(Get-FileHash -LiteralPath $exe).Hash.ToLowerInvariant();packagedUiManifestSha256=(Get-FileHash -LiteralPath $package).Hash.ToLowerInvariant()}
$identity | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runPath 'launch.json')
$identity
