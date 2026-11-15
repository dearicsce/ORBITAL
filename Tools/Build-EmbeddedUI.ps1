param([string]$Output = 'Assets/StreamingAssets/EmbeddedUI')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$sdk = Join-Path $PSScriptRoot 'Dependencies/WebView2-1.0.3967.48'
$package = Join-Path $sdk 'sdk.zip'
if (!(Test-Path -LiteralPath "$sdk/lib/net462/Microsoft.Web.WebView2.Core.dll")) {
    New-Item -ItemType Directory -Force $sdk | Out-Null
    Invoke-WebRequest 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.3967.48/microsoft.web.webview2.1.0.3967.48.nupkg' -OutFile $package
    Expand-Archive -LiteralPath $package -DestinationPath $sdk -Force
}
$target = Join-Path $root $Output
New-Item -ItemType Directory -Force $target | Out-Null
Copy-Item -LiteralPath "$sdk/lib/net462/Microsoft.Web.WebView2.Core.dll","$sdk/runtimes/win-x64/native/WebView2Loader.dll","$sdk/LICENSE.txt","$sdk/NOTICE.txt" -Destination $target -Force
$sources = @(Get-ChildItem -LiteralPath "$PSScriptRoot/EmbeddedUI" -Filter '*.cs' | ForEach-Object FullName)
$sources += Join-Path $root 'Assets/Orbital/Runtime/PresentationFrames.cs'
& 'C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe' /nologo /platform:x64 /target:winexe "/out:$target/Orbital.EmbeddedUI.exe" "/r:$target/Microsoft.Web.WebView2.Core.dll" $sources
if ($LASTEXITCODE -ne 0) { throw 'Embedded UI host compilation failed.' }
