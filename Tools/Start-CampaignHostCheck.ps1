param(
    [int]$Port = 19330,
    [ValidateSet('Candidate','Baseline')][string]$Build = 'Candidate',
    [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$Tag,
    [switch]$IsolatedExports,
    [ValidateRange(0,60)][int]$WaitPortSeconds = 0,
    [string]$RunName = (Get-Date -Format 'yyyyMMdd-HHmmss')
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ($RunName -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Use a simple isolated test run name.' }
$record = Join-Path $root 'Verification/Campaign-2026-11-09'
$profile = Join-Path $record "$Build-$RunName"
$managedCheck = 'ManagedCheck' + $(if ($Tag) { "-$Tag" })
$exe = if ($Build -eq 'Candidate') { Join-Path $root "Verification/V03Parity/$managedCheck/Player/ORBITAL.exe" }
       else { Join-Path $root 'Build-Display/ORBITAL.exe' }
if (!(Test-Path -LiteralPath $exe)) { throw 'Build the copied verification player first.' }
$deadline = [DateTime]::UtcNow.AddSeconds($WaitPortSeconds)
while (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    if ([DateTime]::UtcNow -ge $deadline) { throw "Port $Port is already in use." }
    Start-Sleep -Milliseconds 500
}
$env:ORBITAL_PROFILE_DIR = $profile
$env:ORBITAL_VERIFY_METRICS = '1'
if ($IsolatedExports) { $env:ORBITAL_EXPORT_DIR = Join-Path $profile 'Exports' }
else { Remove-Item Env:ORBITAL_EXPORT_DIR -ErrorAction SilentlyContinue }
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port --remote-debugging-address=127.0.0.1"
Remove-Item Env:ORBITAL_WEB_UI -ErrorAction SilentlyContinue
$process = Start-Process -FilePath $exe -ArgumentList '-logFile',"$profile-player.log" -PassThru
[pscustomobject]@{ Id=$process.Id; Profile=$profile; Executable=$exe; Port=$Port; StartedUtc=$process.StartTime.ToUniversalTime().ToString('o') }
