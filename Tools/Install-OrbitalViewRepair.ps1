$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$record=Join-Path $root 'Verification/OrbitalViews-2026-11-15'
$release=Join-Path $record 'Release'
$target=Join-Path $root 'Build-Current'
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$staged=Join-Path $root "Build-Current.Staged-$stamp"
$rollback=Join-Path $root "Build-Current.Rollback-$stamp"
foreach($location in @($release,$target,$staged,$rollback)){
 $resolved=[IO.Path]::GetFullPath($location)
 if(!$resolved.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Installation path escaped the project.'}
}
$checks=Get-Content -LiteralPath (Join-Path $record 'Host/checks.json') -Raw | ConvertFrom-Json
$manifest=Join-Path $release 'ORBITAL_Data/StreamingAssets/WebUI/dependency-manifest.json'
if($checks.status -ne 'passed' -or !$checks.packageManifestSha256 -or (Get-FileHash -LiteralPath $manifest).Hash.ToLowerInvariant() -ne $checks.packageManifestSha256){throw 'This release has not passed the Windows view check.'}
if(!(Select-String -LiteralPath (Join-Path $record 'unity-build-release.log') -SimpleMatch 'ORBITAL Windows build succeeded.')){throw 'Successful complete Unity build required.'}

Copy-Item -LiteralPath $release -Destination $staged -Recurse
$files=@(Get-ChildItem -LiteralPath $release -Recurse -File | ForEach-Object {
 $relative=[IO.Path]::GetRelativePath($release,$_.FullName)
 $hash=(Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant()
 if((Get-FileHash -LiteralPath (Join-Path $staged $relative)).Hash.ToLowerInvariant() -ne $hash){throw "Staged file mismatch: $relative"}
 [pscustomobject]@{file=$relative;sha256=$hash}
})

# Close normally so the existing browser can flush its saved flight. Never
# force-terminate a user session to install an update.
$running=Get-Process -Name ORBITAL -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq (Join-Path $target 'ORBITAL.exe')}
foreach($process in $running){
 if(!$process.CloseMainWindow() -or !$process.WaitForExit(10000)){throw 'The current game is still open; the verified staged build and current installation were retained.'}
}
$profile=Join-Path $env:LOCALAPPDATA 'ORBITAL/Current/Profile'
$saved=Join-Path $record "ProfileBefore-$stamp"
foreach($relative in @('Exports','WebUI/EBWebView/Default/Local Storage','WebUI/EBWebView/Default/Session Storage')){
 $source=Join-Path $profile $relative
 if(Test-Path -LiteralPath $source){
  foreach($file in (Get-ChildItem -LiteralPath $source -Recurse -File | Where-Object {$_.Name -ne 'LOCK'})){
   $destination=Join-Path $saved ([IO.Path]::GetRelativePath($profile,$file.FullName))
   New-Item -ItemType Directory -Force (Split-Path -Parent $destination) | Out-Null
   Copy-Item -LiteralPath $file.FullName -Destination $destination
  }
 }
}
$moved=$false
try{
 if(Test-Path -LiteralPath $target){Move-Item -LiteralPath $target -Destination $rollback;$moved=$true}
 Move-Item -LiteralPath $staged -Destination $target
}catch{
 if($moved -and !(Test-Path -LiteralPath $target)){Move-Item -LiteralPath $rollback -Destination $target}
 throw
}
@{installed=$target;rollback=$rollback;saveBackup=$saved;packageManifestSha256=$checks.packageManifestSha256;files=$files} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $record 'installation.json')
Write-Output "Installed $($files.Count) hash-verified files. Previous build: $rollback. Save backup: $saved."
