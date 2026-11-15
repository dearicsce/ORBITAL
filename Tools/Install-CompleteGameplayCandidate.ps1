param(
 [switch]$VerifyOnly,
 [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$Record = 'CompleteGameplay-2026-11-11',
 [ValidatePattern('^[a-zA-Z0-9_ -]+$')][string]$CandidateDirectory = 'Candidate'
)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$recordPath=Join-Path $root "Verification\$Record"
$candidate=Join-Path $recordPath $CandidateDirectory
$target=Join-Path $root 'Build-Display'
$manifest=Join-Path $recordPath 'candidate-hashes.json'
if(!(Test-Path -LiteralPath $manifest)){throw 'Candidate verification manifest is missing.'}
$expected=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach($entry in (Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json).files){
 if(!$expected.Add($entry.file.Replace('\','/'))){throw 'Duplicate candidate manifest entry.'}
 $file=[IO.Path]::GetFullPath((Join-Path $candidate $entry.file))
 if(!$file.StartsWith($candidate+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Manifest path escaped candidate.'}
 if(!(Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256){throw "Candidate hash mismatch: $($entry.file)"}
}
$shipped=Get-ChildItem -LiteralPath $candidate -Recurse -Force
if($shipped | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}){throw 'Candidate contains a reparse point; review it before promotion.'}
foreach($item in ($shipped | Where-Object {!$_.PSIsContainer})){
 $relative=$item.FullName.Substring($candidate.Length+1).Replace('\','/')
 if(!$expected.Contains($relative)){throw "Unexpected unmanifested candidate file: $relative"}
}
if($VerifyOnly){Write-Output 'Verified candidate hashes. No installation changed.';return}
$running=Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.StartsWith($target+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)}
if($running){throw 'Close the installed ORBITAL game before promotion. Existing installation and profiles were retained.'}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$staged=Join-Path $root ('Build-Display.Staged-'+$stamp)
$rollback=Join-Path $root ('Build-Display.Rollback-'+$stamp)
foreach($path in @($staged,$rollback,$target)){
 $resolved=[IO.Path]::GetFullPath($path)
 if(!$resolved.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe installation path.'}
}
Copy-Item -LiteralPath $candidate -Destination $staged -Recurse
$moved=$false
try{
 if(Test-Path -LiteralPath $target){Move-Item -LiteralPath $target -Destination $rollback;$moved=$true}
 Move-Item -LiteralPath $staged -Destination $target
 Write-Output "Installed tested candidate. Rollback directory: $rollback. User profiles were not changed."
}catch{
 if($moved -and !(Test-Path -LiteralPath $target)){Move-Item -LiteralPath $rollback -Destination $target}
 throw
}
