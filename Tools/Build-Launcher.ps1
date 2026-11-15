$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $compiler /nologo /target:winexe /optimize+ /reference:System.Windows.Forms.dll ("/out:"+(Join-Path $root 'Orbital.exe')) (Join-Path $PSScriptRoot 'OrbitalLauncher.cs')
if($LASTEXITCODE -ne 0){throw 'ORBITAL launcher compilation failed.'}
