param([int]$Port=19366)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$record=Join-Path $root 'Verification/Sol61-2026-11-10'
foreach($kind in @('Baseline','Candidate')) {
 $profile=Join-Path $record "Perf-$kind"
 $evidence=Join-Path $record "Perf-$kind-Evidence"
 New-Item -ItemType Directory -Path $evidence -Force | Out-Null
 $exe=if($kind -eq 'Baseline'){Join-Path $root 'Build-Display/ORBITAL.exe'}else{Join-Path $record 'Candidate/ORBITAL.exe'}
 $env:ORBITAL_PROFILE_DIR=$profile
 $env:ORBITAL_EXPORT_DIR=Join-Path $profile 'Exports'
 $env:ORBITAL_VERIFY_METRICS='1'
 $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=$Port --remote-debugging-address=127.0.0.1"
 $player=Start-Process -FilePath $exe -WindowStyle Hidden -ArgumentList '-logFile',"$profile-player.log" -PassThru
 [pscustomobject]@{Id=$player.Id;Executable=$exe;Profile=$profile;StartedUTC=$player.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content "$evidence/launch.json"
 $sampling=Start-Job -FilePath "$PSScriptRoot/Sample-CampaignProcesses.ps1" -ArgumentList $player.Id,"$evidence/processes.csv",150
 $env:ORBITAL_TEST_PORT="$Port"
 $env:ORBITAL_TEST_ARTIFACTS=$evidence
 & node "$PSScriptRoot/Check-HostPerformance.mjs" > "$evidence/console.log" 2>&1
 $testExit=$LASTEXITCODE
 & node "$PSScriptRoot/Check-EmbeddedCampaign.mjs" quit > "$evidence/quit.log" 2>&1
 $still=Get-Process -Id $player.Id -ErrorAction SilentlyContinue
 if($still -and !$still.WaitForExit(15000)){throw "Verification player did not quit: $($player.Id)"}
 Receive-Job -Job $sampling -Wait -AutoRemoveJob | Out-Null
 if($testExit -ne 0){throw "$kind performance verification failed; see $evidence"}
 Write-Output "$kind startup, frame pacing, repeated scenes and native working sets measured."
}
