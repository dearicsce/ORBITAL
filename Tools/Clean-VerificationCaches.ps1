param([string]$Record='Verification/UsabilityRelease-2026-11-11')
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$verification=[IO.Path]::GetFullPath((Join-Path $root 'Verification'))
$recordPath=[IO.Path]::GetFullPath((Join-Path $root $Record))
if(!$recordPath.StartsWith($verification+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Record must be inside Verification'}
$plan=Get-Content -LiteralPath (Join-Path $recordPath 'cleanup-plan.json') -Raw | ConvertFrom-Json
$rows=@()
foreach($item in $plan){
 $target=[IO.Path]::GetFullPath($item.path)
 if(!$target.StartsWith($verification+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Cache target escaped Verification'}
 if($target -notmatch '\\EBWebView\\' -or ([IO.Path]::GetFileName($target)) -notin @('Cache','Code Cache','GPUCache','DawnCache','GrShaderCache','ShaderCache','GraphiteDawnCache')){throw 'Unexpected cache type'}
 $ownedProfilePath=$target.Substring(0,$target.IndexOf('\EBWebView\',[StringComparison]::OrdinalIgnoreCase))
 # Re-read ownership immediately before each removal. Retain active profiles.
 $active=Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe' OR Name='ORBITAL.exe' OR Name='Orbital.EmbeddedUI.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.IndexOf($ownedProfilePath,[StringComparison]::OrdinalIgnoreCase) -ge 0}
 $status='retained active profile';$removed=0
 if(!$active -and (Test-Path -LiteralPath $target)){
  $chain=Get-Item -LiteralPath $target -Force
  $reparse=$false
  while($chain -and $chain.FullName.StartsWith($verification,[StringComparison]::OrdinalIgnoreCase)){
   if($chain.Attributes -band [IO.FileAttributes]::ReparsePoint){$reparse=$true;break};$chain=$chain.Parent
  }
  if(!$reparse){$reparse=@(Get-ChildItem -LiteralPath $target -Recurse -Force | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}).Count -gt 0}
  if($reparse){$status='retained reparse point'}else{
   $bytes=[long](Get-ChildItem -LiteralPath $target -Recurse -Force -File | Measure-Object Length -Sum).Sum
   try{Remove-Item -LiteralPath $target -Recurse -Force;$removed=$bytes;$status='removed regenerable inactive cache'}
   catch{$remaining=[long](Get-ChildItem -LiteralPath $target -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum;$removed=[Math]::Max(0,$bytes-$remaining);$status='retained remaining cache after filesystem refusal: '+$_.Exception.Message}
  }
 }
 $rows+=[pscustomobject]@{path=$target;classification='D';inventoriedBytes=$item.bytes;removedBytes=$removed;status=$status;reason=$item.reason;dependencyEvidence=$item.dependencyEvidence;recovery=$item.recovery}
 $rows | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $recordPath 'cleanup-manifest.json')
}
$rows | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $recordPath 'cleanup-manifest.json')
$freed=[long]($rows | Measure-Object removedBytes -Sum).Sum
[pscustomobject]@{removedBytes=$freed;removedDirectories=@($rows | Where-Object {$_.removedBytes -gt 0}).Count;archivedBytes=0;note='No profiles, Local Storage, IndexedDB, exports, source assets or accepted evidence removed.'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $recordPath 'cleanup-summary.json')
Write-Output "Removed $freed bytes of inactive verification caches."
