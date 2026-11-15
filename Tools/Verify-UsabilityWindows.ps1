param([int]$Port=19514,[string]$RunDirectory='Verification/UsabilityRelease-2026-11-11/DeliveryUsability',[switch]$Attach,[string]$StartAt='')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$relative=$RunDirectory
$run=if($Attach){Get-Content -LiteralPath (Join-Path $root "$relative/launch.json") -Raw | ConvertFrom-Json}else{& "$PSScriptRoot/Start-IsolatedCandidate.ps1" -Run $relative -Port $Port}
$env:ORBITAL_TEST_PORT="$Port"
$env:ORBITAL_TEST_ARTIFACTS=Join-Path $run.run 'Evidence'
$env:ORBITAL_TEST_EXPORT_DIR=$run.exports
$env:ORBITAL_TEST_SKIP_OPERATIONS='1'
$endInput=(Get-ChildItem -LiteralPath (Join-Path $root 'Verification/UsabilityRelease-2026-11-11/AcceptedCampaign/Profile/Exports') -Filter 'orbital-flight-m1-*.json' | Select-Object -First 1).FullName
$cases=@(
 @('Tools/Check-EmbeddedCampaign.mjs','startup'),
 @('Tools/Check-KeyboardMission.mjs'),
 @('Tools/Check-PlanningHost.mjs'),
 @('Tools/Check-UsabilityHost.mjs'),
 @('Tools/Check-EmbeddedCampaign.mjs','layout'),
 @('Tools/Check-GameplayReleaseHost.mjs','end-dynamics',$endInput),
 @('Tools/Check-EmbeddedCampaign.mjs','mission-evidence-demo'),
 @('Tools/Check-GameplayReleaseHost.mjs','full-experiment'),
 @('Tools/Check-GameplayReleaseHost.mjs','stale-save'),
 @('Tools/Check-EmbeddedCampaign.mjs','roundtrip'),
 @('Tools/Check-EmbeddedCampaign.mjs','corrupt-campaign'),
 @('Tools/Check-GameplayReleaseHost.mjs','postflight')
)
$results=@()
$active=[string]::IsNullOrEmpty($StartAt)
foreach($case in $cases){
 $name=([IO.Path]::GetFileNameWithoutExtension($case[0]))+$(if($case.Count -gt 1){'-'+$case[1]})
 if(!$active){if($name -eq $StartAt){$active=$true}else{continue}}
 & node @case *> (Join-Path $run.run ($name+'.log'))
 $code=$LASTEXITCODE
 $results+=@{name=$name;exit=$code;arguments=$case}
 $results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $run.run 'case-results.json')
 Write-Output "$name exit $code"
 if($code -ne 0){throw "Windows acceptance failed: $name. Evidence retained in $($run.run)"}
}
Start-Sleep -Seconds 3
$restarted=& "$PSScriptRoot/Start-IsolatedCandidate.ps1" -Run $relative -Port $Port -WaitPortSeconds 30
$restarted | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $run.run 'restart-launch.json')
& node Tools/Check-GameplayReleaseHost.mjs restart-after *> (Join-Path $run.run 'restart-after.log')
if($LASTEXITCODE -ne 0){throw 'Offline process-restart acceptance failed'}
& node Tools/Check-EmbeddedCampaign.mjs quit *> (Join-Path $run.run 'quit.log')
Write-Output 'Windows usability, comparisons, corruption, shutdown/restart and offline acceptance passed.'
