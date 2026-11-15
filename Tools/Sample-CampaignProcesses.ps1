param(
    [Parameter(Mandatory)][int]$PlayerId,
    [Parameter(Mandatory)][string]$Csv,
    [ValidateRange(2,1800)][int]$Seconds = 90
)
$ErrorActionPreference = 'Stop'
$deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
while ([DateTime]::UtcNow -lt $deadline -and (Get-Process -Id $PlayerId -ErrorAction SilentlyContinue)) {
    $processes = @(Get-CimInstance Win32_Process -Filter "Name='ORBITAL.exe' OR Name='Orbital.EmbeddedUI.exe' OR Name='msedgewebview2.exe'")
    $owned = [Collections.Generic.HashSet[int]]::new()
    [void]$owned.Add($PlayerId)
    do {
        $prior = $owned.Count
        foreach ($process in $processes) {
            if ($owned.Contains([int]$process.ParentProcessId)) { [void]$owned.Add([int]$process.ProcessId) }
        }
    } while ($owned.Count -ne $prior)
    $stamp = [DateTime]::UtcNow.ToString('o')
    Get-Process -Id @($owned) -ErrorAction SilentlyContinue | ForEach-Object {
        [pscustomobject]@{
            utc=$stamp; pid=$_.Id; process=$_.ProcessName; cpu_seconds=$_.CPU
            working_set_bytes=$_.WorkingSet64; private_bytes=$_.PrivateMemorySize64
        }
    } | Export-Csv -LiteralPath $Csv -Append -NoTypeInformation
    Start-Sleep -Seconds 2
}
