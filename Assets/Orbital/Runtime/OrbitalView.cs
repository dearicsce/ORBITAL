using System;
using System.Collections.Generic;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Orbital
{
    public sealed partial class OrbitalView
    {
        readonly Camera camera;
        readonly Light sun, fill;
        readonly Transform hangar, rocket, satellite, earthSystem, earth, marker, station;
        readonly Material white, black, copper, blue, gold, teal, deck, glow, fog;
        readonly Dictionary<string, Transform> anchors = new Dictionary<string, Transform>();
        readonly LineRenderer path;
        Transform fairing, wideShell, narrowShell, fairingRing, lower, upper, boosters, cameraPart, battery, extension, dish, wingLeft, wingRight, plume;
        GameObject sockets, floor, starfield, launchSite;
        Transform coreBell;
        string orbitRevision;
        Vector3[] orbit;
        public float yaw = 19, pitch = 12, zoom = 1;
        bool inSpace;
        bool framed;
        Vector3 cameraFocus;
        float smoothYaw, smoothPitch, smoothDistance, separationAmount;
        Transform upperEngine, lowerTank, upperTank, recorder, stowedPayload;
        readonly Transform[] strapOns = new Transform[2];
        MeshRenderer[] wideRenderers, narrowRenderers;
        public Vec DisplayPosition { get; private set; }
        public double DisplayClock { get; private set; }
        public RenderTexture Texture { get; private set; }
        Rect guiRect;
        public static Color ColorOf(uint hex) => new Color(((hex >> 16) & 255) / 255f, ((hex >> 8) & 255) / 255f, (hex & 255) / 255f);

        public OrbitalView(bool embedded = false)
        {
            var cam = new GameObject("Viewport camera");
            camera = cam.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = ColorOf(0x111f2d);
            camera.nearClipPlane = .04f;
            camera.farClipPlane = 180;
            camera.fieldOfView = 36;
            camera.allowMSAA = true;
            camera.enabled = false;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = ColorOf(0x68788f);
            RenderSettings.ambientIntensity = .85f;
            sun = MakeLight("Key / Sun", ColorOf(0xffebd4), 1.85f, new Vector3(35, -35, 0));
            fill = MakeLight("Hangar fill", ColorOf(0x70baff), .75f, new Vector3(28, 135, 0));
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = .7f;
            sun.shadowBias = .025f;
            QualitySettings.shadowDistance = 45;

            white = Material("Ice ceramic", 0xd1e0e8, .15f, .32f);
            black = Material("Graphite", 0x1c2833, .2f, .46f);
            copper = Material("Machined bronze", 0xa65129, .26f, .35f);
            blue = Material("Solar cells", 0x223b75, .45f, .62f);
            gold = Material("Insulation", 0xe8a249, .35f, .5f);
            teal = Material("Cyan enamel", 0x3ea9b0, .28f, .5f);
            deck = Material("Hangar deck", 0x172632, .05f, .3f);
            glow = Unlit("Active interface", 0x63e8dc);
            fog = Material("Cutaway shell", 0x91d7e1, .1f, .32f);
            fog.SetFloat("_Mode", 3);
            fog.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            fog.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            fog.SetInt("_ZWrite", 0);
            fog.EnableKeyword("_ALPHABLEND_ON");
            fog.renderQueue = 3000;
            var ghost = fog.color; ghost.a = .19f; fog.color = ghost;

            hangar = Root("Assembly hangar");
            rocket = Root("ORBITAL two-stage assembly", hangar);
            satellite = Root("Floodwatch spacecraft", hangar);
            if (!embedded)
            {
                PrepareHangar();
                MakeRocket();
                MakeLaunchSite();
                MakeSatellite();
            }
            earthSystem = Root("Earth inertial neighbourhood");
            earth = Part(PrimitiveType.Sphere, "Blue Marble Earth", earthSystem, Vector3.zero, Vector3.one * 5.9f,
                Material("Earth surface", 0xffffff, 0, .18f));
            earth.GetComponent<MeshRenderer>().sharedMaterial.mainTexture = Resources.Load<Texture2D>("earth-surface");
            var earthShader = Resources.Load<Shader>("NasaEarth");
            if (earthShader != null)
            {
                var earthMaterial = new Material(earthShader) { name = "NASA Eyes Earth" };
                earthMaterial.SetTexture("_MainTex", Resources.Load<Texture2D>("earth-surface"));
                earthMaterial.SetTexture("_CloudTex", Resources.Load<Texture2D>("earth-cloud"));
                earthMaterial.SetTexture("_NightTex", Resources.Load<Texture2D>("earth-night"));
                earthMaterial.SetTexture("_SpecTex", Resources.Load<Texture2D>("earth-specular"));
                earth.GetComponent<MeshRenderer>().sharedMaterial = earthMaterial;
            }
            marker = Part(PrimitiveType.Sphere, "Orbital vehicle", earthSystem, Vector3.zero, Vector3.one * .115f, glow);
            station = Part(PrimitiveType.Sphere, "Ground station", earthSystem, Vector3.zero, Vector3.one * .08f, gold);
            path = Root("Propagated track", earthSystem).gameObject.AddComponent<LineRenderer>();
            path.material = Unlit("Track", 0x49a59a);
            path.widthMultiplier = .017f;
            path.useWorldSpace = true;
            path.loop = true;
            starfield = Root("Procedural background stars", earthSystem).gameObject;
            MakeStars(starfield.transform);
        }

        void PrepareHangar()
        {
            if (floor != null) return;
            var floorRoot = Root("Workshop scenery", hangar);
            floor = floorRoot.gameObject;
            var concrete = Material("Concrete deck", 0x808b94, 0, .15f);
            concrete.mainTexture = Resources.Load<Texture2D>("Workshop/concrete");
            concrete.mainTextureScale = new Vector2(8, 8);
            Part(PrimitiveType.Cube, "Deck", floorRoot, new Vector3(0, -.2f, 0), new Vector3(52, .3f, 52), concrete);
            var grid = Unlit("Grid", 0x2a4150);
            for (int i = -3; i <= 3; i++)
            {
                Part(PrimitiveType.Cube, "Deck seam", floorRoot, new Vector3(i * 4, -.04f, 0), new Vector3(.018f, .008f, 24), deck);
                Part(PrimitiveType.Cube, "Deck seam", floorRoot, new Vector3(0, -.04f, i * 4), new Vector3(24, .008f, .018f), deck);
            }
            MakeHangar(floorRoot);
            Part(PrimitiveType.Cylinder, "Turntable", floorRoot, new Vector3(0, .02f, 0), new Vector3(4.7f, .07f, 4.7f), black);
            Part(PrimitiveType.Cylinder, "Turntable rim", floorRoot, new Vector3(0, .08f, 0), new Vector3(4.73f, .012f, 4.73f), teal);
            Part(PrimitiveType.Cylinder, "Turntable surface", floorRoot, new Vector3(0, .10f, 0), new Vector3(4.55f, .025f, 4.55f), deck);
            for (int i = 0; i < 8; i++)
            {
                float x = -11 + i * 3.2f;
                Part(PrimitiveType.Cube, "Hangar mullion", floorRoot, new Vector3(x, 3, -7), new Vector3(.12f, 6, .18f), deck);
                Part(PrimitiveType.Cube, "Hangar luminaires", floorRoot, new Vector3(x, 5.8f, -6.9f), new Vector3(.8f, .04f, .04f), glow);
            }

        }

        void MakeRocket()
        {
            lower = Root("Core assembly", rocket);
            upper = Root("Upper assembly", rocket);
            fairing = Root("Fairing assembly", upper);
            boosters = Root("Symmetric strap-on pair", rocket);
            lowerTank = Part(PrimitiveType.Cylinder, "Lower tank", lower, new Vector3(0, 2.03f, 0), new Vector3(1.01f, 1.56f, 1.01f), white);
            Band(lower, 3.34f, 1.03f, black);
            Band(lower, .73f, 1.04f, copper);
            Band(lower, 2.79f, 1.022f, teal);
            coreBell = Bell("Core bell", lower, new Vector3(0, .27f, 0), .31f, .43f);
            var branding = new GameObject("ORBITAL markings").AddComponent<TextMesh>();
            branding.transform.SetParent(lower, false);
            branding.transform.localPosition = new Vector3(0, 2.2f, .511f);
            branding.transform.localRotation = Quaternion.Euler(0, 180, 90);
            branding.text = "ORBITAL";
            branding.anchor = TextAnchor.MiddleCenter;
            branding.alignment = TextAlignment.Center;
            branding.fontSize = 76;
            branding.characterSize = .062f;
            branding.color = ColorOf(0x143443);

            upperTank = Part(PrimitiveType.Cylinder, "Upper tank", upper, new Vector3(0, 4.09f, 0), new Vector3(.87f, .49f, .87f), white);
            Band(upper, 3.64f, .91f, copper);
            Band(upper, 4.52f, .9f, black);
            upperEngine = Bell("Upper engine", upper, new Vector3(0, 3.39f, 0), .29f, .30f);
            Part(PrimitiveType.Cylinder, "Payload adapter", upper, new Vector3(0, 4.66f, 0), new Vector3(.65f, .105f, .65f), teal);
            stowedPayload = Part(PrimitiveType.Cube, "Folded spacecraft", upper, new Vector3(0, 4.98f, 0), new Vector3(.5f, .5f, .5f), gold);
            fairingRing = Part(PrimitiveType.Cylinder, "Fairing flange", fairing, new Vector3(0, 4.67f, 0), new Vector3(1.10f, .045f, 1.10f), teal);
            wideShell = Shell(fairing, 1.09f);
            narrowShell = Shell(fairing, .76f);
            wideRenderers = wideShell.GetComponentsInChildren<MeshRenderer>();
            narrowRenderers = narrowShell.GetComponentsInChildren<MeshRenderer>();
            RocketDetails();
            for (int i = -1; i <= 1; i += 2)
            {
                float x = .91f * i;
                Transform strapOn = strapOns[(i + 1) / 2] = Root(i < 0 ? "Port booster" : "Starboard booster", boosters);
                Part(PrimitiveType.Cylinder, "Booster tank", strapOn, new Vector3(x, 1.46f, 0), new Vector3(.43f, 1.03f, .43f), white);
                Part(PrimitiveType.Sphere, "Booster cap", strapOn, new Vector3(x, 2.48f, 0), new Vector3(.42f, .73f, .42f), teal);
                Part(PrimitiveType.Cube, "Booster bracket", strapOn, new Vector3(x * .73f, 1.78f, 0), new Vector3(.38f, .08f, .14f), black);
                Bell("Booster bell", strapOn, new Vector3(x, .28f, 0), .15f, .18f);
            }
            sockets = Root("Socket indicators", rocket).gameObject;
            foreach (float height in new[] { 3.56f, 3.71f, 4.56f, 4.67f })
                Part(PrimitiveType.Cylinder, "Mounting interface", sockets.transform, new Vector3(0, height, 0), new Vector3(1.12f, .022f, 1.12f), glow);

            plume = Part(PrimitiveType.Sphere, "Exhaust", rocket, new Vector3(0, -.5f, 0), new Vector3(.36f, 1.85f, .36f), Unlit("Hot exhaust", 0xffaa56));
            Anchor("Lower tank", lower, 0, 2.55f, .54f);
            Anchor("Upper tank", upper, 0, 4.15f, .49f);
            Anchor("Upper feed", upper, 0, 3.83f, .49f);
            Anchor("Upper engine", upperEngine, 0, .16f, .29f);
            Anchor("Fairing", fairing, 0, 5.43f, .56f);
            Anchor("Staging", rocket, 0, 3.52f, .61f);
            Anchor("Boosters", boosters, .93f, 1.55f, .24f);
        }

        Transform Shell(Transform parent, float width)
        {
            var shell = Root("Fairing envelope", parent);
            var profile = new[] {
                new Vector2(width * .5f, 0), new Vector2(width * .5f, .70f),
                new Vector2(width * .48f, .92f), new Vector2(width * .39f, 1.16f),
                new Vector2(width * .24f, 1.38f), new Vector2(.002f, 1.57f)
            };
            for (int i = 0; i < 2; i++)
                Lathe("Fairing half", shell, new Vector3(0, 4.67f, 0), profile, white,
                    -Mathf.PI / 2 + i * Mathf.PI, Mathf.PI);
            return shell;
        }

        void Band(Transform parent, float y, float size, Material material) =>
            Part(PrimitiveType.Cylinder, "Stage band", parent, new Vector3(0, y, 0), new Vector3(size, .035f, size), material);

        void MakeSatellite()
        {
            Part(PrimitiveType.Cube, "Bus / avionics", satellite, new Vector3(0, 1.73f, 0), new Vector3(1.5f, 1.18f, 1.16f), black);
            foreach (float x in new[] { -.69f, .69f })
                foreach (float z in new[] { -.54f, .54f })
                    Part(PrimitiveType.Cube, "Chassis rail", satellite, new Vector3(x, 1.74f, z), new Vector3(.11f, 1.33f, .12f), white);
            Part(PrimitiveType.Cube, "Upper deck", satellite, new Vector3(0, 2.32f, 0), new Vector3(1.49f, .08f, 1.13f), gold);
            Part(PrimitiveType.Cube, "Lower deck", satellite, new Vector3(0, 1.14f, 0), new Vector3(1.49f, .08f, 1.13f), gold);
            wingLeft = Wing(-1);
            wingRight = Wing(1);
            battery = Part(PrimitiveType.Cube, "Battery module", satellite, new Vector3(.49f, 1.91f, .62f), new Vector3(.41f, .52f, .3f), teal);
            extension = Part(PrimitiveType.Cube, "Extended energy module", battery, new Vector3(.07f, 0, .61f), new Vector3(.74f, .92f, .58f), teal);
            recorder = Part(PrimitiveType.Cube, "Recorder", satellite, new Vector3(-.45f, 1.75f, .62f), new Vector3(.38f, .51f, .26f), white);
            cameraPart = Root("Optical survey camera", satellite);
            var lens = Part(PrimitiveType.Cylinder, "Lens barrel", cameraPart, new Vector3(0, 1.62f, .67f), new Vector3(.55f, .32f, .55f), white);
            lens.localRotation = Quaternion.Euler(90, 0, 0);
            var glass = Part(PrimitiveType.Cylinder, "Optical glass", cameraPart, new Vector3(0, 1.62f, 1.0f), new Vector3(.37f, .025f, .37f), blue);
            glass.localRotation = lens.localRotation;
            dish = Root("Tracking dish", satellite);
            Part(PrimitiveType.Cylinder, "Pointing mast", dish, new Vector3(.21f, 2.53f, 0), new Vector3(.11f, .24f, .11f), white);
            var antenna = Part(PrimitiveType.Sphere, "Dish", dish, new Vector3(.21f, 2.8f, 0), new Vector3(.81f, .15f, .79f), white);
            antenna.localRotation = Quaternion.Euler(20, 0, 26);
            Part(PrimitiveType.Cylinder, "Feed horn", dish, new Vector3(.19f, 2.91f, 0), new Vector3(.07f, .17f, .07f), gold);
            Anchor("Battery", satellite, .50f, 1.95f, .87f);
            Anchor("Array", wingRight, 1.21f, .08f, .25f);
            Anchor("Bus", satellite, 0, 2.18f, .62f);
            Anchor("Recorder", satellite, -.47f, 1.75f, .84f);
            Anchor("Payload", satellite, 0, 1.58f, 1.02f);
            Anchor("Antenna", dish, .21f, 2.82f, .38f);
        }

        Transform Wing(int sign)
        {
            var wing = Root(sign < 0 ? "Port array" : "Starboard array", satellite);
            Part(PrimitiveType.Cube, "Array spar", wing, new Vector3(sign * 1.01f, 1.76f, 0), new Vector3(.63f, .12f, .12f), white);
            var panel = Root("Photovoltaic wing", wing);
            panel.localPosition = new Vector3(sign * 2.1f, 1.76f, 0);
            panel.localRotation = Quaternion.Euler(-15, 0, 0);
            Part(PrimitiveType.Cube, "Panel frame", panel, Vector3.zero, new Vector3(1.88f, .9f, .061f), white);
            for (int x = 0; x < 8; x++)
                for (int y = 0; y < 4; y++)
                    Part(PrimitiveType.Cube, "Silicon cell", panel, new Vector3((x - 3.5f) * .226f, (y - 1.5f) * .205f, .04f), new Vector3(.209f, .188f, .025f), blue);
            Vector3 pivot = new Vector3(sign * .82f, 1.76f, 0);
            foreach (Transform child in wing) child.localPosition -= pivot;
            wing.localPosition = pivot;
            return wing;
        }

        void MakeStars(Transform parent)
        {
            var rng = new System.Random(1947);
            var material = Unlit("Star points", 0x9ab5ce);
            var mesh = new Mesh();
            var vertices = new List<Vector3>();
            var triangles = new List<int>();
            for (int i = 0; i < 420; i++)
            {
                Vector3 d = new Vector3((float)rng.NextDouble() * 2 - 1, (float)rng.NextDouble() * 2 - 1, (float)rng.NextDouble() * 2 - 1);
                if (d.sqrMagnitude > 1 || d.sqrMagnitude < .02f) continue;
                Vector3 p = d.normalized * 65;
                Vector3 u = Vector3.Cross(d, Vector3.up).normalized * .09f, v = Vector3.Cross(d, u).normalized * .09f;
                int j = vertices.Count;
                vertices.AddRange(new[] { p + u, p - v, p - u, p + v });
                triangles.AddRange(new[] { j, j + 1, j + 2, j + 2, j + 3, j, j + 2, j + 1, j, j, j + 3, j + 2 });
            }
            mesh.SetVertices(vertices);
            mesh.SetTriangles(triangles, 0);
            parent.gameObject.AddComponent<MeshFilter>().sharedMesh = mesh;
            parent.gameObject.AddComponent<MeshRenderer>().sharedMaterial = material;
        }

        public void SetRect(Rect gui)
        {
            guiRect = gui;
            camera.enabled = gui.width > 0 && gui.height > 0;
            if (!camera.enabled) return;
            // Draw the camera inside the GUI so it clips correctly when the page scrolls.
            int width = Mathf.Max(1, Mathf.RoundToInt(gui.width));
            int height = Mathf.Max(1, Mathf.RoundToInt(gui.height));
            if (Texture == null || Texture.width != width || Texture.height != height)
            {
                camera.targetTexture = null;
                if (Texture != null) { Texture.Release(); Object.Destroy(Texture); }
                Texture = new RenderTexture(width, height, 24) { name = "ORBITAL viewport", antiAliasing = 4 };
                camera.targetTexture = Texture;
            }
            camera.rect = new Rect(0, 0, 1, 1);
        }

        public void ShowLaunch(Flight flight) =>
            ShowHangar(flight.Review.Design, false, false, false, false, 0, -1,
                flight.State.ascent, flight.State.prelaunchRemaining);

        public void ShowHangar(Blueprint b, bool ship, bool cutaway, bool exploded, bool showSockets, int isolation,
            double dryRun, Ascent ascent = null, double prelaunchRemaining = 0, bool frame = true)
        {
            camera.fieldOfView = 36;
            if (referenceCraft != null) referenceCraft.gameObject.SetActive(false);
            inSpace = false;
            hangar.gameObject.SetActive(true);
            earthSystem.gameObject.SetActive(false);
            fill.enabled = true;
            RenderSettings.ambientLight = ColorOf(0x424e60);
            sun.transform.rotation = Quaternion.Euler(35, -35, 0);
            camera.backgroundColor = ColorOf(0x142535);
            rocket.gameObject.SetActive(!ship);
            if (satellite.parent != hangar)
            {
                satellite.SetParent(hangar, false);
                satellite.localPosition = Vector3.zero;
                satellite.localScale = Vector3.one;
                satellite.localRotation = Quaternion.identity;
            }
            satellite.gameObject.SetActive(ship);
            floor.SetActive(ascent == null);
            launchSite.SetActive(ascent != null);
            if (ascent != null) camera.backgroundColor = Color.Lerp(ColorOf(0x6389a4), ColorOf(0x050b17), Mathf.Clamp01((float)ascent.Height / 90000));
            float blend = 1 - Mathf.Exp(-12 * Time.unscaledDeltaTime);
            separationAmount = Mathf.Lerp(separationAmount, exploded ? .65f : 0, blend);
            float separation = separationAmount;
            float drop = dryRun > 1.5 ? (float)Math.Min(4, (dryRun - 1.5) * 1.8) : 0;
            double stageSeparationAge = ascent?.stage > 0 ? ascent.seconds - ascent.stageTime : 0;
            if (stageSeparationAge > 0) drop = (float)(stageSeparationAge * stageSeparationAge * 3);
            lower.localPosition = Vector3.down * drop;
            upper.localPosition = Vector3.up * separation;
            fairing.localPosition = Vector3.up * separation;
            lower.gameObject.SetActive(isolation != 2 && (ascent == null || ascent.stage == 0 || stageSeparationAge < 1.5f));
            upper.gameObject.SetActive(isolation != 1);
            double fairingAge = ascent?.fairingGone == true
                ? ascent.fairingTime > 0 ? ascent.seconds - ascent.fairingTime : 10
                : Math.Max(0, dryRun - 2.55);
            double boosterAge = ascent?.boosterGone == true ? ascent.seconds - ascent.boosterTime : 0;
            fairing.gameObject.SetActive(fairingAge < 2.4);
            fairingRing.gameObject.SetActive(fairingAge <= 0);
            boosters.gameObject.SetActive(b.boosters > 0 && isolation != 2
                && (ascent == null || ascent.stage == 0 || ascent.boosterGone) && boosterAge < 2.4);
            for (int i = 0; i < strapOns.Length; i++)
            {
                float age = (float)boosterAge;
                strapOns[i].localPosition = new Vector3((2 * i - 1) * age * .8f, -age * age * 2.8f - (ascent == null ? drop : 0), 0);
            }
            sockets.SetActive(showSockets && ascent == null);
            wideShell.gameObject.SetActive(b.fairing == 0);
            narrowShell.gameObject.SetActive(b.fairing != 0);
            var shell = b.fairing == 0 ? wideRenderers : narrowRenderers;
            for (int i = 0; i < shell.Length; i++)
            {
                MeshRenderer mesh = shell[i];
                mesh.sharedMaterial = cutaway ? fog : white;
                float age = (float)fairingAge;
                float side = 1 - 2 * i;
                mesh.transform.localPosition = new Vector3(side * age * 1.2f, 4.67f - age * age, 0);
                mesh.transform.localRotation = Quaternion.Euler(0, 0, -side * age * 25);
            }
            lowerTank.localScale = new Vector3(b.lowerTank == 0 ? 1.01f : 1.06f, 1.56f, b.lowerTank == 0 ? 1.01f : 1.06f);
            upperTank.localScale = new Vector3(b.upperTank == 1 ? .93f : .87f, .49f, b.upperTank == 1 ? .93f : .87f);
            upperTank.GetComponent<MeshRenderer>().sharedMaterial = b.upperTank == 2 ? copper : white;
            upperEngine.localPosition = Vector3.Lerp(upperEngine.localPosition, new Vector3(b.engineOffset ? .18f : 0, 3.39f, 0), blend);
            upperEngine.localScale = Vector3.one * (b.engine == 0 ? 1 : 1.10f);
            fairingRing.localScale = new Vector3(b.fairing == 0 ? 1.10f : .79f, .045f, b.fairing == 0 ? 1.10f : .79f);
            if (ship) ConfigureSatellite(b, separation, 1);
            bool rehearsalBurn = dryRun >= 0 && dryRun < 3.2;
            bool firing = ascent != null && !ascent.failed && ascent.stage < 2
                && ascent.stageFuel > 1e-7 && prelaunchRemaining <= Flight.IgnitionHoldSeconds;
            plume.gameObject.SetActive(rehearsalBurn || firing);
            float nozzleY = ascent?.stage == 1 || dryRun >= 1.5 ? upperEngine.localPosition.y : coreBell.localPosition.y;
            stowedPayload.localPosition = new Vector3(0, 4.98f + (dryRun > 3.2 ? (float)(dryRun - 3.2) * .5f : 0), 0);
            float effectTime = ascent == null ? (float)dryRun : (float)(ascent.seconds - prelaunchRemaining);
            float flameLength = 1.5f + .08f * Mathf.Sin(effectTime * 37);
            if (prelaunchRemaining > 0) flameLength *= Mathf.Lerp(.1f, 1, 1 - (float)prelaunchRemaining);
            plume.localScale = new Vector3(.30f, flameLength, .30f);
            plume.localPosition = Vector3.up * (nozzleY - flameLength * .47f);
            rocket.localRotation = ascent == null ? Quaternion.identity : Quaternion.Euler(0, 0, (float)(ascent.pitch - 90));
            Vector3 target = new Vector3(0, ship ? 1.95f : 3.65f, 0);
            rocket.localPosition = Vector3.zero;
            if (ascent != null)
            {
                // Render the launch site in a local frame. Double-precision altitude
                // remains in the integrator; the distant pad never sets the initial state.
                float height = (float)Math.Max(0, ascent.Height / 12);
                launchSite.transform.localPosition = Vector3.down * height;
                rocket.localPosition = Vector3.up * (PadSurface - coreBell.localPosition.y);
                target = rocket.localPosition + rocket.localRotation * new Vector3(0, ascent.stage == 0 ? 2.7f : 4.2f, 0);
            }
            if (frame) Frame(target, (ship ? 12.8f : ascent == null ? 14.2f : 17.5f) * zoom, yaw, pitch);
            if (ascent != null) ShowPadSmoke(firing ? effectTime + (float)Flight.IgnitionHoldSeconds : -1);
        }

        void ConfigureSatellite(Blueprint b, float exploded, float deployed)
        {
            wingLeft.localPosition = new Vector3(-.82f - exploded * .72f, 1.76f, 0);
            wingRight.localPosition = new Vector3(.82f + exploded * .72f, 1.76f, 0);
            wingLeft.localScale = wingRight.localScale = new Vector3(b.array == 0 ? 1 : 1.33f, 1, 1);
            float sweep = Mathf.Lerp(84, b.array == 0 ? 0 : 12, deployed);
            wingLeft.localRotation = Quaternion.Euler(0, -sweep, 0);
            wingRight.localRotation = Quaternion.Euler(0, sweep, 0);
            dish.localScale = new Vector3(1, Mathf.Lerp(.8f, 1, deployed), 1);
            extension.gameObject.SetActive(b.battery > 0);
            extension.localScale = new Vector3(.74f, .92f, b.battery == 2 ? 1.05f : .58f);
            cameraPart.gameObject.SetActive(b.payload == 0);
            dish.gameObject.SetActive(b.antenna == 0);
            recorder.localScale = new Vector3(.38f, b.recorder == 0 ? .51f : .29f, .26f);
        }

        public void ShowOrbit(Review review, Flight flight, int mapLevel, bool follow, double remainder = 0)
        {
            camera.fieldOfView = 36;
            inSpace = true;
            hangar.gameObject.SetActive(false);
            earthSystem.gameObject.SetActive(true);
            fill.enabled = false;
            RenderSettings.ambientLight = ColorOf(0x182337);
            camera.backgroundColor = ColorOf(0x050c18);
            double fraction = flight?.State.operations != null && !flight.State.finished ? Math.Max(0, Math.Min(Physics.OrbitStep, remainder)) : 0;
            double clock = (flight?.Clock ?? 0) + fraction;
            DisplayClock = clock;
            var sunVector = review.Vehicle.Sun;
            sun.transform.rotation = Quaternion.LookRotation(-WorldDirection(sunVector));
            earth.localRotation = Quaternion.Euler(0, (float)(-Physics.Spin * clock / Physics.Degree), 0);
            bool detailed = mapLevel == 0;
            earth.gameObject.SetActive(detailed);
            station.gameObject.SetActive(detailed);
            bool spacecraftVisible = detailed && flight?.State.operations != null;
            satellite.gameObject.SetActive(spacecraftVisible);
            marker.gameObject.SetActive(detailed && !spacecraftVisible);
            path.gameObject.SetActive(detailed && review.Forecast != null);
            station.position = Position(Physics.Station(clock));
            Vec pos = flight?.State.operations?.r ?? review.Insertion?.r ?? new Vec(Physics.Radius * 1.04, 0);
            if (fraction > 0)
            {
                Vec velocity = flight.State.operations.v;
                Physics.Propagate(ref pos, ref velocity, fraction);
            }
            DisplayPosition = pos;
            marker.position = Position(pos);
            if (spacecraftVisible)
            {
                if (satellite.parent != earthSystem) satellite.SetParent(earthSystem, false);
                // An enlarged vehicle keeps its configuration legible at the planet scale.
                satellite.localScale = Vector3.one * .066f;
                satellite.localRotation = Quaternion.LookRotation(Vector3.down, marker.position.normalized);
                satellite.localPosition = marker.position - satellite.localRotation * (Vector3.up * 1.73f * .066f);
                float deploy = Mathf.SmoothStep(0, 1, (float)((flight.State.operations.elapsed + fraction) / 3));
                ConfigureSatellite(flight.Review.Design, 0, deploy);
            }
            if (detailed && review.Forecast != null && orbitRevision != review.Revision)
            {
                orbitRevision = review.Revision;
                orbit = new Vector3[160];
                Vec r = review.Insertion.r, v = review.Insertion.v;
                double segment = Physics.Elements(r, v).period / orbit.Length;
                for (int i = 0; i < orbit.Length; i++)
                {
                    orbit[i] = Position(r);
                    for (int step = 0; step < 12; step++) Physics.Propagate(ref r, ref v, segment / 12);
                }
                path.positionCount = orbit.Length;
                path.SetPositions(orbit);
            }
            Vector3 focus = follow ? marker.position * .58f : Vector3.zero;
            Frame(focus, detailed ? 11.6f * zoom : 13, yaw + 69, pitch + (follow ? 11 : 18));
        }

        public void ShowHomeEarth()
        {
            camera.fieldOfView = 36;
            inSpace = true;
            hangar.gameObject.SetActive(false);
            earthSystem.gameObject.SetActive(true);
            fill.enabled = false;
            RenderSettings.ambientLight = ColorOf(0x182337);
            camera.backgroundColor = ColorOf(0x050c18);
            sun.transform.rotation = Quaternion.LookRotation(-WorldDirection(Vec.At(-45 * Physics.Degree)));
            earth.GetComponent<MeshRenderer>().sharedMaterial.SetVector("_SunDirection", -sun.transform.forward);
            path.gameObject.SetActive(false);
            station.gameObject.SetActive(false);
            marker.gameObject.SetActive(false);
            Frame(Vector3.zero, 11.6f * zoom, yaw + 69, pitch + 18);
        }

        static Vector3 WorldDirection(Vec r) => new Vector3((float)r.x, 0, (float)r.y);
        static Vector3 Position(Vec r) => new Vector3((float)(r.x / Physics.Radius * 2.95), 0, (float)(r.y / Physics.Radius * 2.95));
        public Vector2 OrbitPoint(Vec r) => Project(Position(r));
        public Vector2 WorldAnchor(string name)
        {
            if (inSpace || !anchors.TryGetValue(name, out var anchor) || !anchor.gameObject.activeInHierarchy)
                return new Vector2(float.NaN, float.NaN);
            return Project(anchor.position);
        }

        Vector2 Project(Vector3 point)
        {
            Vector3 p = camera.WorldToViewportPoint(point);
            if (p.z <= 0) return new Vector2(float.NaN, float.NaN);
            return new Vector2(guiRect.x + p.x * guiRect.width, guiRect.y + (1 - p.y) * guiRect.height);
        }

        void Frame(Vector3 target, float distance, float heading, float elevation)
        {
            float blend = framed ? 1 - Mathf.Exp(-14 * Time.unscaledDeltaTime) : 1;
            cameraFocus = Vector3.Lerp(cameraFocus, target, blend);
            smoothYaw = Mathf.LerpAngle(smoothYaw, heading, blend);
            smoothPitch = Mathf.Lerp(smoothPitch, elevation, blend);
            smoothDistance = Mathf.Lerp(smoothDistance, distance, blend);
            framed = true;
            float elevationRad = smoothPitch * Mathf.Deg2Rad;
            float yawRad = smoothYaw * Mathf.Deg2Rad;
            float horizontal = Mathf.Cos(elevationRad);
            Vector3 back = new Vector3(horizontal * Mathf.Sin(yawRad), Mathf.Sin(elevationRad), horizontal * Mathf.Cos(yawRad));
            camera.transform.position = cameraFocus + back * smoothDistance;
            camera.transform.LookAt(cameraFocus);
        }

        public void ResetFraming() { framed = false; }

        public void ApplyOrbitDrag(float horizontalDrag, float verticalDragUp)
        {
            yaw += horizontalDrag * .45f;
            pitch = Mathf.Clamp(pitch + verticalDragUp * .33f, -40, 55);
        }

        static Light MakeLight(string name, Color color, float intensity, Vector3 euler)
        {
            var obj = new GameObject(name);
            var light = obj.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = color;
            light.intensity = intensity;
            obj.transform.rotation = Quaternion.Euler(euler);
            return light;
        }

        void Anchor(string name, Transform parent, float x, float y, float z)
        {
            var anchor = Root(name + " annotation", parent);
            anchor.localPosition = new Vector3(x, y, z);
            anchors[name] = anchor;
        }

        static Transform Root(string name, Transform parent = null)
        {
            var t = new GameObject(name).transform;
            t.SetParent(parent, false);
            return t;
        }

        static Transform Part(PrimitiveType shape, string name, Transform parent, Vector3 pos, Vector3 scale, Material material)
        {
            var item = GameObject.CreatePrimitive(shape);
            item.name = name;
            item.transform.SetParent(parent, false);
            item.transform.localPosition = pos;
            item.transform.localScale = scale;
            item.GetComponent<MeshRenderer>().sharedMaterial = material;
            Object.Destroy(item.GetComponent<Collider>());
            return item.transform;
        }

        static Material Material(string name, uint hex, float metallic, float smoothness)
        {
            var m = new Material(Shader.Find("Standard")) { name = name, color = ColorOf(hex), enableInstancing = true };
            m.SetFloat("_Metallic", metallic);
            m.SetFloat("_Glossiness", smoothness);
            return m;
        }

        static Material Unlit(string name, uint hex) =>
            new Material(Shader.Find("Unlit/Color")) { name = name, color = ColorOf(hex) };
    }
}
