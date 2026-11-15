# ORBITAL

An educational spacecraft design and mission game built with Unity.

Design a spacecraft and launcher, fly campaign missions, manage resources,
and compare the evidence returned by your mission.

## Play in Chrome

[Launch ORBITAL in your browser](https://dearicsce.github.io/ORBITAL/).

## Play the Windows demo

[Download ORBITAL for Windows](https://github.com/dearicsce/ORBITAL/releases/tag/v1.0.0-demo)

Download the **ORBITAL-Windows-Demo-2026-11-15.zip** asset, extract the whole
archive, and run **Orbital.exe**. Keep **Build-Current** beside the launcher.

Requires Windows x64, Direct3D 11, Microsoft Edge WebView2 Evergreen Runtime,
and .NET Framework 4.6.2 or newer.

## Source layout

- Assets/Orbital: Unity runtime, mission logic, numerical core, and scene adapter.
- Assets/Editor: Unity build entry point.
- Assets/Resources and Assets/Scenes: game resources and Unity scenes.
- Assets/StreamingAssets: packaged browser UI and embedded Windows host.
- Tools/EmbeddedUI: maintained browser gameplay modules and host source.
- Tools: packaging, checks, launcher source, and build utilities.
- Packages and ProjectSettings: pinned Unity dependencies and project settings.
- ReferenceSource: pinned browser reference snapshot used by the UI packer.
- Docs: build ownership, scientific assumptions, and repair documentation.

Unity .meta files are included because their asset IDs and import settings
are required by the project. Generated builds and local caches are excluded.

## Get the source

Install Git and Git LFS, then:

~~~powershell
git lfs install
git clone https://github.com/dearicsce/ORBITAL.git
cd ORBITAL
~~~

Open the project with **Unity 6000.6.8f1**. Large 3D assets and videos are
stored in Git LFS; if needed, run git lfs pull after cloning.

## Build on Windows

With the Unity editor closed, run these commands from the repository root:

~~~powershell
node Tools/Pack-WebUI.mjs ./ReferenceSource
& ./Tools/Build-EmbeddedUI.ps1
& 'C:/path/to/Unity/6000.6.8f1/Editor/Unity.exe' -batchmode -nographics -quit -projectPath $PWD.Path -executeMethod OrbitalBuild.VerifyAndBuild -logFile ./unity-build.log
# Wait for Unity to finish successfully before continuing.
& ./Tools/Build-Launcher.ps1
~~~

Adjust the Unity executable path to your installation. The embedded host
build downloads its pinned WebView2 SDK when it is missing.

See [build ownership](Docs/BUILD_AND_OWNERSHIP.md) and
[science assumptions](Docs/SCIENCE_AND_SOURCES.md) for details. Some retained
engineering reports describe paths and verification artifacts from the
original development machine.

## Scope and third-party materials

This is an educational game using authored assumptions and simplified
transfers. It is not operational spacecraft mission-planning software.

Existing third-party notices and attributions are retained. No additional
redistribution license is granted by this upload.
