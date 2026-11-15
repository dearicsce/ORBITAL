Space Mission Design Game - 3D Models Directory
=================================================

Rules for adding custom 3D models to the game:

1. Format: Binary glTF (.glb) files only. Do NOT use .gltf with external .bin or image textures.
2. Orientation: Y-up coordinate system. Models must be modeled upright.
3. Origin / Pivot: The model's vertical base must be placed at the scene origin (y = 0), and horizontally centered (x = 0, z = 0).
4. File Size: Strictly under 8 MB per asset to preserve instant in-browser loading.
5. Compression: Standard glTF 2.0 without Draco compression (so standard Three.js GLTFLoader loads without external WASM decoders).
6. Materials / Textures: Embed materials (PBR Metallic/Roughness preferred). Ensure textures are power-of-two (e.g. 512x512, 1024x1024).
7. Attribution & Credits: Always document model sources, licenses, and author credits in models/CREDITS.txt.
8. Registration: Add or update the model entry in models/manifest.json pointing "file" to your .glb path (e.g. "models/rockets/kestrel.glb").
