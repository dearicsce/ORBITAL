param([int]$Port=19516)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$record='Verification/UsabilityRelease-2026-11-11'
$variants=@(
 @{Name='Baseline';Player='Verification/MissionJourney-2026-11-11/FinalCandidate/ORBITAL.exe'},
 @{Name='Candidate';Player="$record/Candidate Player/ORBITAL.exe"}
)
$results=@()
foreach($variant in $variants){
 for($sample=1;$sample -le 3;$sample++){
  $relative="$record/ControlledPerformance/$($variant.Name)-$sample"
  $run=& "$PSScriptRoot/Start-IsolatedCandidate.ps1" -Player $variant.Player -Run $relative -Port $Port -WaitPortSeconds 30
  $env:ORBITAL_TEST_PORT="$Port"
  $env:ORBITAL_TEST_ARTIFACTS=Join-Path $root "$relative/Evidence"
  & node Tools/Check-EmbeddedCampaign.mjs startup | Out-File (Join-Path $run.run 'startup-check.log')
  if($LASTEXITCODE -ne 0){throw 'Fresh-profile controls failed'}
  $ready=Get-Content -LiteralPath (Join-Path $env:ORBITAL_TEST_ARTIFACTS 'startup.json') -Raw | ConvertFrom-Json
  $freshReadyUtc=$ready[0].observedUtc
  $freshMs=([DateTimeOffset]($ready[0].observedUtc)-[DateTimeOffset]($run.startedUtc)).TotalMilliseconds
  if($sample -eq 1){
   $mode=if($variant.Name -eq 'Candidate'){'cooperative'}else{'synchronous'}
   & node Tools/Measure-DesignForecast.mjs (Join-Path $root "$record/$($variant.Name.ToLower())-forecast-controlled.json") $mode *> (Join-Path $run.run 'forecast-check.log')
   if($LASTEXITCODE -ne 0){throw 'Controlled forecast measurement failed'}
   $sampler=Start-Job -FilePath "$PSScriptRoot/Sample-CampaignProcesses.ps1" -ArgumentList $run.pid,(Join-Path $run.run 'processes.csv'),150
   & node Tools/Check-EmbeddedCampaign.mjs performance *> (Join-Path $run.run 'performance-check.log')
   $performanceExit=$LASTEXITCODE
  }
  $quitStarted=[DateTime]::UtcNow
  & node Tools/Check-EmbeddedCampaign.mjs quit | Out-File (Join-Path $run.run 'quit-check.log')
  $process=Get-Process -Id $run.pid -ErrorAction SilentlyContinue
  if($process -and !$process.WaitForExit(15000)){throw 'Test player failed to exit'}
  $shutdown=& "$PSScriptRoot/Wait-OwnedHostExit.ps1" -Launch (Join-Path $run.run 'launch.json')
  $shutdownMs=([DateTime]::UtcNow-$quitStarted).TotalMilliseconds
  $shutdown | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $run.run 'shutdown.json')
  if($sample -eq 1){Receive-Job -Job $sampler -Wait -AutoRemoveJob | Out-Null}
  Start-Sleep -Seconds 2
  $warm=& "$PSScriptRoot/Start-IsolatedCandidate.ps1" -Player $variant.Player -Run $relative -Port $Port -WaitPortSeconds 30
  $warm | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $run.run 'warm-launch.json')
  & node Tools/Check-EmbeddedCampaign.mjs startup | Out-File (Join-Path $run.run 'warm-startup-check.log')
  if($LASTEXITCODE -ne 0){throw 'Warm-profile controls failed'}
  $ready=Get-Content -LiteralPath (Join-Path $env:ORBITAL_TEST_ARTIFACTS 'startup.json') -Raw | ConvertFrom-Json
  $warmMs=([DateTimeOffset]($ready[0].observedUtc)-[DateTimeOffset]($warm.startedUtc)).TotalMilliseconds
  & node Tools/Check-EmbeddedCampaign.mjs quit | Out-File (Join-Path $run.run 'warm-quit-check.log')
  $process=Get-Process -Id $warm.pid -ErrorAction SilentlyContinue
  if($process -and !$process.WaitForExit(15000)){throw 'Warm test player failed to exit'}
  $warmShutdown=& "$PSScriptRoot/Wait-OwnedHostExit.ps1" -Launch (Join-Path $run.run 'warm-launch.json')
  $warmShutdown | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $run.run 'warm-shutdown.json')
  $results+=@{variant=$variant.Name;sample=$sample;freshLaunch=$run;warmLaunch=$warm;freshReadyUtc=$freshReadyUtc;warmReadyUtc=$ready[0].observedUtc;freshProfileControlsMs=$freshMs;warmProfileControlsMs=$warmMs;shutdownMs=$shutdownMs;remainingChildren=$shutdown.remaining.Count;performanceExit=if($sample -eq 1){$performanceExit}else{$null};profile=$run.profile;packageHash=$run.packagedUiManifestSha256;scope='Process launch to observed visible WebView2 home control; polling/IPC overhead included, not first native pixel'}
  $results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $root "$record/performance-startup.json")
  Start-Sleep -Seconds 2
 }
}
Write-Output 'Completed sequential startup samples (3 fresh and 3 warm per artifact) and one full phase/frame run per artifact.'
