param([switch]$Apply)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$verification=Join-Path $root 'Verification'
$record=Join-Path $root 'Docs/Repair-2026-11-11'
New-Item -ItemType Directory -Force $record | Out-Null
$candidates=[Collections.Generic.List[object]]::new()
function Add-Candidate($path,$reason) {
 if(Test-Path -LiteralPath $path){$candidates.Add([pscustomobject]@{path=[IO.Path]::GetFullPath($path);reason=$reason})}
}
# Retain reports, source snapshots and personal/test saves. Only compiled player
# payloads, repeated browser resources and regenerable caches are candidates.
foreach($exe in Get-ChildItem -LiteralPath $verification -Filter ORBITAL.exe -File -Recurse){
 foreach($name in @('ORBITAL.exe','ORBITAL_Data','MonoBleedingEdge','UnityPlayer.dll','UnityCrashHandler64.exe','D3D12','dstorage.dll','dstoragecore.dll','WinPixEventRuntime.dll','UnityPlayer.pdb','ORBITAL_BurstDebugInformation_DoNotShip')){
  Add-Candidate (Join-Path $exe.DirectoryName $name) 'Obsolete verification player; current complete player is Build-Current; Build-Display retained as rollback.'
 }
}
foreach($dir in Get-ChildItem -LiteralPath $verification -Directory -Recurse){
 if($dir.Name -eq 'ORBITAL_Data') {Add-Candidate $dir.FullName 'Remaining obsolete verification player payload.'}
 if($dir.Parent.Name -eq 'EBWebView' -and $dir.Name -in @('WidevineCdm','EVWhitelist','CertificateRevocation','TrustTokenKeyCommitments','Subresource Filter','Crashpad','component_crx_cache','extensions_crx_cache','BrowserMetrics','Speech Recognition','hyphen-data','Hyphenation')){
  Add-Candidate $dir.FullName 'Regenerable WebView runtime component/download cache; browser saves retained.'
 }
 if($dir.FullName -match '\\EBWebView\\' -and $dir.Name -in @('Cache','Code Cache','GPUCache','DawnCache','GrShaderCache','ShaderCache','GraphiteDawnCache')){
  Add-Candidate $dir.FullName 'Regenerable HTTP/GPU/code cache; saves and exports retained.'
 }
 if($dir.Name -in @('models','vendor','textures','videos','images','assets') -and ($dir.Parent.Name -like 'browser-regressions-*' -or $dir.Parent.Name -in @('WebUI','PreviousWebUI','InterruptedPackage'))){
  Add-Candidate $dir.FullName 'Repeated generated test resources; source assets retained in project and pinned reference.'
 }
 if($dir.Name -in @('Library','Temp','obj') -and $dir.FullName -like '*\BuildProject\*'){
  Add-Candidate $dir.FullName 'Generated isolated Unity build cache; source snapshot retained.'
 }
}
foreach($name in @('Build','Build-Audit','Build-Display.PreV03')){
 Add-Candidate (Join-Path $root $name) 'Superseded build output; current player and one rollback retained.'
}
$plan=@($candidates | Sort-Object path -Unique)
$plan=@($plan | Where-Object { $p=$_.path; !($plan | Where-Object {$p.StartsWith($_.path+'\',[StringComparison]::OrdinalIgnoreCase)}) })
$manifestPath=Join-Path $record 'cleanup-manifest.json'
$rows=if(Test-Path -LiteralPath $manifestPath){@(Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json)}else{@()}
foreach($item in $plan){
 $target=$item.path
 if(!$target.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)){throw "Outside workspace: $target"}
 if(!($target.StartsWith($verification+'\',[StringComparison]::OrdinalIgnoreCase) -or $target -in @((Join-Path $root 'Build'),(Join-Path $root 'Build-Audit'),(Join-Path $root 'Build-Display.PreV03')))){throw "Unexpected deletion: $target"}
 $entry=Get-Item -LiteralPath $target -Force
 $children=if($entry.PSIsContainer){@(Get-ChildItem -LiteralPath $target -Recurse -Force)}else{@($entry)}
 if(($children | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}) -or ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw "Reparse point in $target"}
 $bytes=[long](($children | Where-Object {!$_.PSIsContainer} | Measure-Object Length -Sum).Sum)
 $ownership=$target
 if($target -match '\\EBWebView\\'){$ownership=$target.Substring(0,$target.IndexOf('\EBWebView\',[StringComparison]::OrdinalIgnoreCase))}
 $active=Get-CimInstance Win32_Process | Where-Object {($_.ExecutablePath -and ($_.ExecutablePath.Equals($target,[StringComparison]::OrdinalIgnoreCase) -or $_.ExecutablePath.StartsWith($target+'\',[StringComparison]::OrdinalIgnoreCase))) -or ($_.CommandLine -and $_.CommandLine.IndexOf($ownership+'\',[StringComparison]::OrdinalIgnoreCase) -ge 0)}
 $status='planned';$removed=0
 if($active){$status='retained active process'}elseif($Apply){
  try {
   # Native PowerShell occasionally leaves an emptied directory on its first
   # recursive pass. Retry in the same shell, without broadening the target.
   for($attempt=0;$attempt -lt 3 -and (Test-Path -LiteralPath $target);$attempt++){
    try{Remove-Item -LiteralPath $target -Recurse -Force}catch{if($attempt -eq 2){throw}}
   }
   $removed=$bytes;$status='removed'
  }
  catch {
   $left=if(Test-Path -LiteralPath $target){[long]((Get-ChildItem -LiteralPath $target -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum)}else{0}
   $removed=[Math]::Max(0,$bytes-$left);$status='filesystem refused remaining removal: '+$_.Exception.Message
  }
 }
 $rows += [pscustomobject]@{path=$target;bytes=$bytes;removedBytes=$removed;status=$status;reason=$item.reason}
 $rows | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $record 'cleanup-manifest.json')
}
$summary=[pscustomobject]@{targets=$rows.Count;plannedBytes=[long](($rows | Measure-Object bytes -Sum).Sum);removedBytes=[long](($rows | Measure-Object removedBytes -Sum).Sum)}
$summary | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $record 'cleanup-summary.json')
$summary
