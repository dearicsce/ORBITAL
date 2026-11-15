param(
    [switch]$Launch,
    [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$Tag
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$verify = Join-Path $root ('Verification/V03Parity/ManagedCheck' + $(if ($Tag) { "-$Tag" }))
$player = Join-Path $verify 'Player'
$exe = Join-Path $player 'ORBITAL.exe'
foreach ($running in (Get-Process ORBITAL -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe })) {
    if (!$running.WaitForExit(3000)) { throw 'Close the managed verification player before rebuilding its assembly.' }
}
Push-Location $root
try {
    & node Tools/Pack-WebUI.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Web UI packaging failed.' }
    & "$PSScriptRoot/Build-EmbeddedUI.ps1"
    if (!(Test-Path -LiteralPath $exe)) {
        New-Item -ItemType Directory -Force $player | Out-Null
        $base = Join-Path $root 'Build-Display'
        $data = Join-Path $player 'ORBITAL_Data'
        $streaming = Join-Path $data 'StreamingAssets'
        New-Item -ItemType Directory -Force $streaming | Out-Null
        Get-ChildItem -LiteralPath $base | Where-Object Name -ne 'ORBITAL_Data' |
            Copy-Item -Destination $player -Recurse -Force
        Get-ChildItem -LiteralPath "$base/ORBITAL_Data" | Where-Object Name -ne 'StreamingAssets' |
            Copy-Item -Destination $data -Recurse -Force
        Get-ChildItem -LiteralPath "$base/ORBITAL_Data/StreamingAssets" | Where-Object Name -notin 'WebUI','EmbeddedUI' |
            Copy-Item -Destination $streaming -Recurse -Force
    }
    $dotnet = 'F:/Unity/Editors/6000.6.8f1/Editor/Data/DotNetSdk'
    $references = Get-ChildItem -LiteralPath "$root/Build-Display/ORBITAL_Data/Managed" -Filter '*.dll' |
        Where-Object { $_.Name -ne 'Assembly-CSharp.dll' } | ForEach-Object { '/reference:' + $_.FullName }
    $sources = & rg --files Assets/Orbital -g '*.cs' | ForEach-Object { (Resolve-Path -LiteralPath $_).Path }
    & "$dotnet/dotnet.exe" exec "$dotnet/sdk/8.0.318/Roslyn/bincore/csc.dll" /nologo /noconfig /nostdlib+ /target:library /optimize+ "/out:$verify/Assembly-CSharp.dll" $references $sources
    if ($LASTEXITCODE -ne 0) { throw 'Runtime compilation failed.' }
    Copy-Item -LiteralPath "$verify/Assembly-CSharp.dll" -Destination "$player/ORBITAL_Data/Managed/Assembly-CSharp.dll" -Force
    Copy-Item -LiteralPath Assets/StreamingAssets/WebUI,Assets/StreamingAssets/EmbeddedUI -Destination "$player/ORBITAL_Data/StreamingAssets" -Recurse -Force
    Get-FileHash -LiteralPath "$verify/Assembly-CSharp.dll" | Select-Object Path,Hash
    if ($Launch) {
        $env:ORBITAL_PROFILE_DIR = Join-Path $root 'Verification/V03Parity/EmbeddedSlice'
        Remove-Item Env:ORBITAL_WEB_UI -ErrorAction SilentlyContinue
        $env:ORBITAL_VERIFY_METRICS = '1'
        Start-Process -FilePath $exe -ArgumentList '-logFile',"$root/Logs/v03-embedded-player.log" | Out-Null
    }
}
finally { Pop-Location }
