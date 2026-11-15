
# ORBITAL launcher models

Open `ORBITAL-Launchers.blend` in Blender to edit the seven original launcher meshes. `build_launchers.py` is the reproducible starting point for these models. From this project's root, run:

```powershell
& F:/blender.exe -b --factory-startup --python-exit-code 1 --python Tools/Blender/build_launchers.py
```

Each launcher exports as a glTF binary with independent core, upper stage, fairings and any boosters. Keep the custom properties on the named stage groups and nozzle anchors when exporting edits. The numerical ascent controller uses those properties for visible separation and exhaust placement. The model's local axes are converted by Blender's glTF exporter.

Stage and fairing measurements in the mission simulator are educational values. Blender models show each vehicle's silhouette, livery and components. For original NASA reference spacecraft and their sources, see the model credits in the mission briefings and the release record.
