using System.Collections.Generic;
using UnityEngine;

namespace Orbital
{
    public sealed partial class OrbitalView
    {
        const float PadSurface = .42f;
        readonly Transform[] padSmoke = new Transform[20];
        readonly MaterialPropertyBlock smokeTint = new MaterialPropertyBlock();

        void MakeLaunchSite()
        {
            var site = Root("Coastal launch site", hangar);
            launchSite = site.gameObject;
            var terrain = Material("Coastal grassland", 0x4c6045, 0, .08f);
            var concrete = Material("Launch pad concrete", 0x9c9b91, 0, .12f);
            var steel = Material("Tower painted steel", 0x8d6250, .25f, .35f);
            var marking = Material("Launch pad safety paint", 0xe7bf68, 0, .30f);
            Part(PrimitiveType.Cube, "Ground", site, new Vector3(0, -.52f, 0), new Vector3(200, 1, 200), terrain);
            Part(PrimitiveType.Cube, "Pad apron", site, new Vector3(0, .02f, 0), new Vector3(15, .08f, 13), concrete);
            Part(PrimitiveType.Cube, "Flame trench", site, new Vector3(0, .08f, 0), new Vector3(2.7f, .06f, 9), black);
            Part(PrimitiveType.Cube, "Launch table", site, new Vector3(0, .33f, 0), new Vector3(3.2f, .18f, 2.6f), deck);
            foreach (float x in new[] { -4f, 4f })
                Part(PrimitiveType.Cube, "Apron boundary stripe", site, new Vector3(x, .062f, 0), new Vector3(.1f, .01f, 12), marking);

            var tower = Root("Service tower", site);
            tower.localPosition = new Vector3(-3.9f, 0, -1.5f);
            Part(PrimitiveType.Cube, "Tower footing", tower, new Vector3(0, .12f, 0), new Vector3(1.7f, .24f, 1.7f), concrete);
            foreach (float x in new[] { -.57f, .57f })
                foreach (float z in new[] { -.57f, .57f })
                    Part(PrimitiveType.Cube, "Tower column", tower, new Vector3(x, 3.9f, z), new Vector3(.11f, 7.8f, .11f), steel);
            for (int level = 0; level < 6; level++)
            {
                float y = .45f + level * 1.44f;
                Part(PrimitiveType.Cube, "Tower landing", tower, new Vector3(0, y, 0), new Vector3(1.25f, .08f, 1.25f), deck);
                if (level == 5) continue;
                foreach (float z in new[] { -.57f, .57f })
                {
                    var brace = Part(PrimitiveType.Cube, "Tower brace", tower, new Vector3(0, y + .72f, z),
                        new Vector3(.065f, 1.83f, .065f), steel);
                    brace.localRotation = Quaternion.Euler(0, 0, level % 2 == 0 ? 38.4f : -38.4f);
                }
            }

            // Soft procedural sprites, evaluated from time since ignition.
            Shader smokeShader = Resources.Load<Shader>("Workshop/PadSmoke");
            if (smokeShader == null) return;
            var smoke = new Material(smokeShader) { name = "Pad exhaust smoke" };
            var soft = new Texture2D(32, 32, TextureFormat.RGBA32, false);
            var pixels = new Color32[32 * 32];
            for (int y = 0; y < 32; y++)
                for (int x = 0; x < 32; x++)
                {
                    float distance = new Vector2((x - 15.5f) / 15, (y - 15.5f) / 15).magnitude;
                    pixels[y * 32 + x] = new Color32(255, 255, 255,
                        (byte)(255 * Mathf.Pow(Mathf.Clamp01(1 - distance), 2)));
                }
            soft.SetPixels32(pixels);
            soft.Apply(false, true);
            smoke.mainTexture = soft;
            for (int i = 0; i < padSmoke.Length; i++)
            {
                Transform cloud = Part(PrimitiveType.Quad, "Exhaust cloud", site, Vector3.zero, Vector3.one, smoke);
                var renderer = cloud.GetComponent<MeshRenderer>();
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;
                padSmoke[i] = cloud;
            }
        }

        void ShowPadSmoke(float ignitionAge)
        {
            for (int i = 0; i < padSmoke.Length; i++)
            {
                Transform cloud = padSmoke[i];
                if (cloud == null) continue;
                float age = ignitionAge - i * .13f;
                bool visible = age > 0 && age < 4.5f;
                cloud.gameObject.SetActive(visible);
                if (!visible) continue;
                float side = i % 2 == 0 ? 1 : -1;
                cloud.localPosition = new Vector3(Mathf.Sin(i * 2.1f) * age * .45f, .28f + age * .19f, side * age * 1.7f);
                cloud.localScale = Vector3.one * (.45f + age * .78f);
                cloud.rotation = camera.transform.rotation;
                smokeTint.SetColor("_Color", new Color(.89f, .88f, .83f,
                    Mathf.Min(age * 2, .8f) * (1 - age / 4.5f)));
                cloud.GetComponent<MeshRenderer>().SetPropertyBlock(smokeTint);
            }
        }

        void MakeHangar(Transform parent)
        {
            var wall = Material("Hangar wall panels", 0x263743, .15f, .24f);
            var steel = Material("Structural steel", 0x526472, .55f, .42f);
            var warning = Material("Safety yellow", 0xe3ad51, .1f, .25f);
            Part(PrimitiveType.Cube, "Rear wall", parent, new Vector3(0, 4, -8), new Vector3(32, 8, .3f), wall);
            for (int i = -4; i <= 4; i++)
            {
                float x = i * 3.4f;
                Part(PrimitiveType.Cube, "Wall rib", parent, new Vector3(x, 4, -7.77f), new Vector3(.16f, 8, .23f), steel);
                Part(PrimitiveType.Cube, "Recessed light", parent, new Vector3(x + 1.6f, 5.9f, -7.6f), new Vector3(2.5f, .07f, .06f), glow);
                Part(PrimitiveType.Cube, "Lower wall panel", parent, new Vector3(x + 1.6f, 1.1f, -7.7f), new Vector3(3.1f, 1.9f, .06f), deck);
            }
            foreach (float side in new[] { -1f, 1f })
            {
                Part(PrimitiveType.Cube, "Side wall", parent, new Vector3(side * 15, 4, 0), new Vector3(.3f, 8, 16), wall);
                Part(PrimitiveType.Cube, "Crane rail", parent, new Vector3(side * 7, 7.2f, 0), new Vector3(.25f, .35f, 16), warning);
                Part(PrimitiveType.Cube, "Aisle marking", parent, new Vector3(side * 3.5f, -.035f, 0), new Vector3(.07f, .012f, 12), warning);
                Part(PrimitiveType.Cube, "Equipment cabinet", parent, new Vector3(side * 5, .8f, -5.8f), new Vector3(1.5f, 1.6f, .8f), steel);
                for (int j = 0; j < 6; j++)
                    Part(PrimitiveType.Cube, "Cabinet vent", parent, new Vector3(side * 5, .45f + j * .14f, -5.38f), new Vector3(1.2f, .035f, .018f), black);
            }
            Part(PrimitiveType.Cube, "Overhead gantry", parent, new Vector3(0, 7.3f, -4), new Vector3(14, .45f, .55f), warning);
            for (int i = 0; i < 32; i++)
            {
                float angle = i * Mathf.PI / 16;
                var tick = Part(PrimitiveType.Cube, "Turntable index", parent,
                    new Vector3(Mathf.Cos(angle) * 2.15f, .13f, Mathf.Sin(angle) * 2.15f), new Vector3(.13f, .012f, .035f), warning);
                tick.localRotation = Quaternion.Euler(0, -angle * Mathf.Rad2Deg, 0);
            }

        }

        void RocketDetails()
        {
            foreach (float y in new[] { 1.04f, 2.1f, 3.12f })
            {
                Band(lower, y, 1.016f, white);
                for (int i = 0; i < 12; i++)
                {
                    float angle = i * Mathf.PI / 6;
                    Part(PrimitiveType.Sphere, "Tank fastener", lower,
                        new Vector3(Mathf.Cos(angle) * .51f, y, Mathf.Sin(angle) * .51f), Vector3.one * .027f, black);
                }
            }
            Part(PrimitiveType.Cube, "External cable raceway", lower, new Vector3(-.49f, 2.04f, 0), new Vector3(.075f, 2.6f, .12f), black);
            for (int i = 0; i < 20; i++)
            {
                float angle = i * Mathf.PI / 10;
                Part(PrimitiveType.Cube, "Interstage stiffener", lower,
                    new Vector3(Mathf.Cos(angle) * .5f, 3.43f, Mathf.Sin(angle) * .5f), new Vector3(.026f, .25f, .026f), copper);
            }
        }

        Transform Bell(string name, Transform parent, Vector3 position, float radius, float height)
        {
            // Continuous outer and inner surfaces, open at the exhaust exit.
            return Lathe(name, parent, position, new[] {
                new Vector2(radius, 0), new Vector2(radius * .76f, height * .38f),
                new Vector2(radius * .34f, height * .78f), new Vector2(radius * .28f, height),
                new Vector2(radius * .20f, height), new Vector2(radius * .26f, height * .78f),
                new Vector2(radius * .68f, height * .38f), new Vector2(radius * .92f, 0), new Vector2(radius, 0) }, black);
        }

        static Transform Lathe(string name, Transform parent, Vector3 position, Vector2[] profile, Material material,
            float startAngle = 0, float sweep = 2 * Mathf.PI)
        {
            const int segments = 64;
            var vertices = new List<Vector3>();
            var uv = new List<Vector2>();
            var triangles = new List<int>();
            for (int row = 0; row < profile.Length; row++)
                for (int i = 0; i <= segments; i++)
                {
                    float angle = startAngle + i * sweep / segments;
                    vertices.Add(new Vector3(Mathf.Cos(angle) * profile[row].x, profile[row].y, Mathf.Sin(angle) * profile[row].x));
                    uv.Add(new Vector2((float)i / segments, (float)row / (profile.Length - 1)));
                    if (row == 0 || i == 0) continue;
                    int a = row * (segments + 1) + i, b = a - segments - 1;
                    triangles.AddRange(new[] { b - 1, a - 1, a, b - 1, a, b });
                }
            var mesh = new Mesh { name = name };
            mesh.SetVertices(vertices);
            mesh.SetUVs(0, uv);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            var root = Root(name, parent);
            root.localPosition = position;
            root.gameObject.AddComponent<MeshFilter>().sharedMesh = mesh;
            root.gameObject.AddComponent<MeshRenderer>().sharedMaterial = material;
            return root;
        }
    }
}

