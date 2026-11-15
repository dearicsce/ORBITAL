param([Parameter(Mandatory)][string]$Launch,[ValidateRange(1,60)][int]$TimeoutSeconds=30)
$ErrorActionPreference='Stop'
$identity=Get-Content -LiteralPath $Launch -Raw | ConvertFrom-Json
$ownedProfile=$identity.profile.Replace('/','\')
$started=[DateTime]::UtcNow
$deadline=$started.AddSeconds($TimeoutSeconds)
$remaining=@()
do{
 $remaining=@(Get-CimInstance Win32_Process -Filter "Name='ORBITAL.exe' OR Name='Orbital.EmbeddedUI.exe' OR Name='msedgewebview2.exe' OR Name='UnityCrashHandler64.exe'" | Where-Object {
  $_.ProcessId -eq $identity.pid -or ($_.Name -eq 'UnityCrashHandler64.exe' -and $_.ParentProcessId -eq $identity.pid) -or ($_.CommandLine -and $_.CommandLine.Replace('/','\').IndexOf($ownedProfile,[StringComparison]::OrdinalIgnoreCase) -ge 0)
 })
 if(!$remaining.Count){break}
 Start-Sleep -Milliseconds 500
}while([DateTime]::UtcNow -lt $deadline)
$result=[pscustomobject]@{waitMs=([DateTime]::UtcNow-$started).TotalMilliseconds;remaining=@($remaining | Select-Object ProcessId,Name);profile=$identity.profile;scope='Root player and native/WebView2 processes referencing this owned profile only'}
if($remaining.Count){$result | ConvertTo-Json -Depth 4;throw 'Owned player/host processes remained after the shutdown deadline'}
$result
