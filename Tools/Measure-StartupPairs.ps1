param([int]$Port=19517)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$record='Verification/UsabilityRelease-2026-11-11'
$variants=@(@{Name='Baseline';Player='Verification/MissionJourney-2026-11-11/FinalCandidate/ORBITAL.exe'},@{Name='Candidate';Player="$record/Candidate Player/ORBITAL.exe"})
$rows=@()
for($sample=1;$sample -le 3;$sample++){
 foreach($variant in $variants){
  $relative="$record/StartupPairs/$sample-$($variant.Name)"
  $launch=& "$PSScriptRoot/Start-IsolatedCandidate.ps1" -Run $relative -Player $variant.Player -Port $Port -WaitPortSeconds 30
  $env:ORBITAL_TEST_PORT="$Port"
  $env:ORBITAL_TEST_ARTIFACTS=Join-Path $launch.run 'Evidence'
  $row=@{sample=$sample;variant=$variant.Name;freshLaunch=$launch;method='Interleaved artifacts; fresh profile then same-profile restart; OS filesystem cache not flushed'}
  foreach($temperature in @('fresh','warm')){
   if($temperature -eq 'warm'){$launch=& "$PSScriptRoot/Start-IsolatedCandidate.ps1" -Run $relative -Player $variant.Player -Port $Port -WaitPortSeconds 30;$row.warmLaunch=$launch}
   & node Tools/Check-EmbeddedCampaign.mjs startup *> (Join-Path $launch.run "$temperature-startup.log")
   if($LASTEXITCODE -ne 0){throw 'Startup controls failed'}
   $ready=Get-Content -LiteralPath (Join-Path $env:ORBITAL_TEST_ARTIFACTS 'startup.json') -Raw | ConvertFrom-Json
   $row[$temperature+'ReadyUtc']=$ready[0].observedUtc
   $row[$temperature+'ControlsMs']=([DateTimeOffset]($ready[0].observedUtc)-[DateTimeOffset]($launch.startedUtc)).TotalMilliseconds
   & node Tools/Check-EmbeddedCampaign.mjs quit *> (Join-Path $launch.run "$temperature-quit.log")
   $exit=& "$PSScriptRoot/Wait-OwnedHostExit.ps1" -Launch (Join-Path $launch.run 'launch.json')
   $exit | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $launch.run "$temperature-shutdown.json")
   Start-Sleep -Seconds 2
  }
  $rows+=$row
  $rows | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $root "$record/startup-pairs.json")
  Write-Output "$($variant.Name) pair $sample recorded"
 }
}
