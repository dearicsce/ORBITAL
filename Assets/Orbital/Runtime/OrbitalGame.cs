using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using UnityEngine;

namespace Orbital
{
    public sealed partial class OrbitalGame : MonoBehaviour
    {
        enum Page { Mission, Spacecraft, Launcher, Plan, Review, Flight, Evidence, Atlas, Science, Replay, Trials }
        enum Overlay { None, Power, Propulsion, Mass, Comms, Structure }
        static readonly Color Ink = OrbitalView.ColorOf(0xe6eff4);
        static readonly Color Muted = OrbitalView.ColorOf(0x9cafbe);
        static readonly Color Mint = OrbitalView.ColorOf(0x7de2cd);
        static readonly Color Orange = OrbitalView.ColorOf(0xf6b177);
        static readonly Color Red = OrbitalView.ColorOf(0xffa09a);
        static readonly Color Panel = OrbitalView.ColorOf(0x122330);
        static readonly Color Raised = OrbitalView.ColorOf(0x1b3342);
        static readonly Color Border = OrbitalView.ColorOf(0x304957);
        static readonly Color Base = OrbitalView.ColorOf(0x09131d);
        static readonly Rect Viewport = new Rect(271, 161, 700, 433);
        static readonly Rect WideViewport = new Rect(34, 185, 769, 444);
        readonly Stack<Blueprint> undo = new Stack<Blueprint>(), redo = new Stack<Blueprint>();
        readonly List<string> controls = new List<string>();
        string[] lastControls = Array.Empty<string>();
        string focus, activated;
        int tabIndex = -1;
        float scale;
        Vector2 inset;
        float pageScroll, pageScrollMax;
        int windowWidth = 1280, windowHeight = 720;
        GUIStyle body, small, heading, hero, mono, button, field;
        OrbitalView view;
        Profile profile;
        Blueprint design;
        Review review;
        Flight flight;
        Page page;
        Overlay overlay;
        string component = "Battery", notice = "", search = "", libraryName = "Field prototype";
        string exportPath;
        bool cutaway, exploded, follow, libraryOpen, mapImports, showHelp;
        int isolation, mapLevel, checkIndex, rate = 1;
        double carry, lastSave, dryRun = -1;
        Vector2 listScroll, detailScroll;
        Rect activeView;
        Rect displayArea;
        bool hasViewport, paused;
        bool profileRecovery, checkpointRecovery, openTerminalReport;
        int frames;
        double frameSeconds;
        string fps = "--";
        TextAsset atlasData;
        EmbeddedInterface embedded;
        bool startEmbedded;
        string embeddedStartupError;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Bootstrap()
        {
            if (FindAnyObjectByType<OrbitalGame>() == null)
                new GameObject("ORBITAL mission director").AddComponent<OrbitalGame>();
        }

        void Awake()
        {
            Resolution desktop = Screen.currentResolution;
            Screen.SetResolution(desktop.width, desktop.height, FullScreenMode.FullScreenWindow);
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 1;
            QualitySettings.antiAliasing = 4;
            Application.runInBackground = true;
            startEmbedded = Application.platform == RuntimePlatform.WindowsPlayer
                && Environment.GetEnvironmentVariable("ORBITAL_WEB_UI") != "0";
            view = new OrbitalView(startEmbedded);
            if (startEmbedded) return;
            atlasData = Resources.Load<TextAsset>("browser-campaign-v2");
            profile = new Profile();
            try
            {
                Profile saved = Persistence.Read<Profile>("profile.json");
                if (saved != null)
                {
                    saved.Validate();
                    profile = saved;
                }
            }
            catch (Exception error)
            {
                profileRecovery = true;
                notice = "Profile recovery required. " + error.Message;
            }
            design = profile.design.Copy();
            review = new Review(design);
            try
            {
                FlightState checkpoint = Persistence.ReadFlight();
                if (checkpoint != null)
                {
                    flight = new Flight(checkpoint);
                    openTerminalReport = checkpoint.finished;
                }
            }
            catch (Exception error)
            {
                checkpointRecovery = true;
                notice = "Checkpoint recovery required. " + error.Message;
            }
            LoadCampaign();
        }

        void OnApplicationQuit()
        {
            if (embedded != null || startEmbedded || embeddedStartupError != null)
            {
                embedded?.Dispose();
                embedded = null;
                return;
            }
            if (profile != null) SaveProfile();
            SaveFlight();
        }

        void SaveProfile()
        {
            if (profileRecovery) return;
            try { Persistence.Save("profile.json", profile); }
            catch (Exception error) { notice = "Profile write failed. " + error.Message; }
        }

        bool SaveFlight()
        {
            if (flight == null || checkpointRecovery || profileRecovery) return false;
            try
            {
                Persistence.Save("flight.json", flight.State);
                return true;
            }
            catch (Exception error) { notice = "Checkpoint write failed. " + error.Message; }
            return false;
        }

        void ClaimReward()
        {
            if (profileRecovery) return;
            if (Persistence.ApplyReward(profile, flight)) SaveProfile();
        }

        void Update()
        {
            if (startEmbedded && (EmbeddedInterface.HasPlayerWindow || Time.unscaledTimeAsDouble >= 10))
            {
                startEmbedded = false;
                try { embedded = new EmbeddedInterface(); }
                catch (Exception error)
                {
                    embeddedStartupError = error.Message;
                    Debug.LogError("Mission control startup failed. " + error);
                }
            }
            if (startEmbedded || embeddedStartupError != null) return;
            if (embedded != null)
            {
                embedded.Update(view);
                if (embedded.StartupFailure != null)
                {
                    embeddedStartupError = embedded.StartupFailure;
                    Debug.LogError(embeddedStartupError);
                    embedded.Dispose();
                    embedded = null;
                    return;
                }
                view.SetRect(embedded.Viewport);
                if (embedded.Scene == "earth") view.ShowHomeEarth();
                else if (embedded.Scene == "spacecraft") view.ShowReferenceCraft();
                return;
            }
            frames++;
            frameSeconds += Time.unscaledDeltaTime;
            if (frameSeconds >= 2)
            {
                fps = (frames / frameSeconds).ToString("F0");
                frames = 0;
                frameSeconds = 0;
            }
            if (dryRun >= 0)
            {
                dryRun += Time.unscaledDeltaTime;
                if (dryRun > 5) dryRun = -1;
            }
            if (page == Page.Flight && flight != null && !flight.State.finished && !paused
                && !showHelp && Application.isFocused)
            {
                double frame = Math.Min(Time.unscaledDeltaTime, .1f);
                if (flight.State.prelaunchRemaining > 0)
                {
                    flight.TickPrelaunch(frame);
                    if (flight.State.prelaunchRemaining == 0) SaveFlight();
                }
                else
                {
                    // Bound catch-up after a stalled window or debugger pause.
                    carry += frame * EffectiveRate;
                    for (int i = 0; i < 512 && !flight.State.finished; i++)
                    {
                        double step = flight.State.operations == null ? Physics.Step : Physics.OrbitStep;
                        if (carry < step) break;
                        double start = flight.Clock;
                        var ascent = flight.State.ascent;
                        int stage = ascent.stage;
                        bool fairingGone = ascent.fairingGone, boosterGone = ascent.boosterGone;
                        flight.Advance();
                        carry -= flight.Clock - start;
                        if (ascent.stage != stage || ascent.fairingGone != fairingGone || ascent.boosterGone != boosterGone)
                        {
                            carry = 0;
                            break;
                        }
                    }
                }
                if (Time.unscaledTimeAsDouble - lastSave > 3)
                {
                    lastSave = Time.unscaledTimeAsDouble;
                    SaveFlight();
                }
                if (flight.State.finished)
                {
                    if (SaveFlight()) ClaimReward();
                    openTerminalReport = true;
                }
            }
            if (openTerminalReport && !showHelp && !libraryOpen)
            {
                openTerminalReport = false;
                if (page != Page.Flight) ClaimReward(); // The restored terminal checkpoint is already durable.
                Go(Page.Evidence);
            }
            UpdateReplay();
            UpdateView();
        }

        int EffectiveRate
        {
            get
            {
                var state = flight.State;
                var ascent = state.ascent;
                bool Recent(double time) => time > 0 && ascent.seconds - time < 2.4;
                bool observing = state.operations != null ? state.operations.elapsed < 3
                    : ascent.seconds < 3 || Recent(ascent.fairingTime) || Recent(ascent.boosterTime) || Recent(ascent.stageTime);
                return observing ? 1 : rate;
            }
        }

        void UpdateView()
        {
            // Keep text readable in short windows and scroll to the bottom controls.
            scale = Mathf.Min(Screen.width / 1280f, Mathf.Max(1, Screen.height / 720f));
            bool needsScroll = 720 * scale > Screen.height + .5f;
            if (needsScroll) scale = Mathf.Min(scale, Mathf.Max(1, Screen.width - 20) / 1280f);
            pageScrollMax = needsScroll ? Mathf.Max(0, 720 * scale - Screen.height) : 0;
            pageScroll = Mathf.Clamp(pageScroll, 0, pageScrollMax);
            inset = new Vector2((Screen.width - (needsScroll ? 20 : 0) - 1280 * scale) / 2,
                Mathf.Max(0, (Screen.height - 720 * scale) / 2) - pageScroll);
            bool workshop = page == Page.Spacecraft || page == Page.Launcher;
            hasViewport = workshop || page == Page.Mission || page == Page.Plan || page == Page.Atlas || page == Page.Flight;
            activeView = workshop ? Viewport : WideViewport;
            view.SetRect(hasViewport ? ScaleRect(activeView) : new Rect(0, 0, 0, 0));
            if (workshop)
                view.ShowHangar(PendingDesign(), page == Page.Spacecraft, cutaway, exploded,
                    overlay == Overlay.Structure || pending != null, isolation, dryRun, null);
            else if (page == Page.Flight && flight?.State.operations == null && flight != null)
                view.ShowLaunch(flight);
            else if (hasViewport)
                view.ShowOrbit(page == Page.Flight && flight != null ? flight.Review : review, page == Page.Flight ? flight : null,
                    page == Page.Atlas ? mapLevel : 0, follow && page == Page.Flight, page == Page.Flight ? carry : 0);
        }

        void LateUpdate()
        {
            embedded?.FlushThumbnail(view);
        }

        Rect ScaleRect(Rect rect) => new Rect(inset.x + rect.x * scale, inset.y + rect.y * scale, rect.width * scale, rect.height * scale);
        Vector2 Unscale(Vector2 pos) => (pos - inset) / scale;

        void Go(Page next)
        {
            if (next == Page.Flight && flight == null) return;
            if (next == Page.Evidence && flight == null) return;
            if (page == Page.Flight) SaveFlight();
            if (next == Page.Flight && page != Page.Flight)
            {
                rate = 1;
                carry = 0;
                paused = false;
            }
            if (next == Page.Science) scienceBack = page;
            if (page != next) view.ResetFraming();
            page = next;
            pageScroll = 0;
            listScroll = detailScroll = Vector2.zero;
            focus = null;
            tabIndex = -1;
            libraryOpen = false;
            CancelPart();
            dryRun = -1;
            if (next != Page.Launcher && next != Page.Spacecraft) return;
            component = next == Page.Spacecraft ? "Battery" : "Lower tank";
            overlay = Overlay.None;
            isolation = 0;
            view.yaw = next == Page.Spacecraft ? 12 : 19;
            view.pitch = 12;
            view.zoom = 1;
            search = "";
            workshopScroll = Vector2.zero;
        }

        void Change(Action<Blueprint> update)
        {
            Blueprint next = design.Copy();
            update(next);
            if (!next.Valid || next.Key == design.Key) return;
            undo.Push(design);
            redo.Clear();
            Apply(next);
        }

        void Apply(Blueprint next)
        {
            CancelPart();
            design = next;
            profile.design = next.Copy();
            review = new Review(next);
            SaveProfile();
        }

        void Undo()
        {
            if (undo.Count == 0) return;
            redo.Push(design);
            Apply(undo.Pop());
        }

        void Redo()
        {
            if (redo.Count == 0) return;
            undo.Push(design);
            Apply(redo.Pop());
        }

        void StartFlight()
        {
            if (!review.CanLaunch) return;
            if (profileRecovery || checkpointRecovery)
            {
                notice = "Resolve the profile or checkpoint recovery error before launching.";
                return;
            }
            if (flight != null && !flight.State.finished)
            {
                notice = "A flight is in progress. Resume or archive it before committing another launch.";
                return;
            }
            Flight previous = flight;
            flight = new Flight(review, FlightSnapshot.Freeze(review), startOnPad: true);
            if (!SaveFlight())
            {
                flight = previous;
                return;
            }
            paused = false;
            rate = 1;
            carry = 0;
            view.yaw = 17;
            view.zoom = 1;
            exportPath = null;
            Go(Page.Flight);
        }

        void OnGUI()
        {
            if (startEmbedded || embeddedStartupError != null || (embedded != null && !embedded.Ready))
            {
                Styles();
                GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.blackTexture);
                GUI.Label(new Rect(32, 32, Screen.width - 64, 48), "ORBITAL", hero);
                string status = embeddedStartupError == null
                    ? "Loading mission control…"
                    : "Mission control could not start. " + embeddedStartupError;
                GUI.Label(new Rect(32, 94, Screen.width - 64, 100), status, body);
                if (embeddedStartupError != null && GUI.Button(new Rect(32, 170, 130, 34), "Exit")) Application.Quit();
                return;
            }
            if (embedded != null)
            {
                if (Event.current.type == EventType.KeyDown && Event.current.keyCode == KeyCode.F11)
                {
                    ToggleFullscreen();
                    Event.current.Use();
                }
                GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.blackTexture);
                Rect clip = embedded.Clip;
                if (view.Texture != null && embedded.Scene != "none" && clip.width > 0 && clip.height > 0)
                {
                    GUI.BeginGroup(clip);
                    Rect rectangle = embedded.Viewport;
                    rectangle.position -= clip.position;
                    GUI.DrawTexture(rectangle, view.Texture, ScaleMode.StretchToFill, false);
                    GUI.EndGroup();
                }
                if (!string.IsNullOrEmpty(embedded.Error)) GUI.Label(new Rect(20, 20, Screen.width - 40, 60), embedded.Error);
                return;
            }
            if (scale <= 0) return;
            Styles();
            Event e = Event.current;
            if (e.type == EventType.KeyDown)
            {
                if (e.keyCode == KeyCode.F11 || (e.alt && e.keyCode == KeyCode.Return))
                {
                    ToggleFullscreen();
                    e.Use();
                }
                else if (e.keyCode == KeyCode.Tab && lastControls.Length > 0)
                {
                    tabIndex = (tabIndex + (e.shift ? lastControls.Length - 1 : 1) + lastControls.Length) % lastControls.Length;
                    focus = lastControls[tabIndex];
                    GUI.FocusControl(null);
                    e.Use();
                }
                else if ((e.keyCode == KeyCode.Return || e.keyCode == KeyCode.KeypadEnter) && focus != null)
                {
                    activated = focus;
                    e.Use();
                }
                else if (e.keyCode == KeyCode.Escape)
                {
                    if (pending != null) CancelPart();
                    else if (libraryOpen) libraryOpen = false;
                    else if (showHelp) showHelp = false;
                    else if (page == Page.Flight) paused = !paused;
                    else Go(Page.Mission);
                    e.Use();
                }
                else if (e.keyCode == KeyCode.F12) { Capture(); e.Use(); }
                else if (!showHelp && !libraryOpen && GUI.GetNameOfFocusedControl() != "parts-search" && e.control && e.keyCode == KeyCode.Z) { Undo(); e.Use(); }
                else if (!showHelp && !libraryOpen && GUI.GetNameOfFocusedControl() != "parts-search" && e.control && e.keyCode == KeyCode.Y) { Redo(); e.Use(); }
                else if (!showHelp && !libraryOpen && page == Page.Flight && e.keyCode == KeyCode.Space) { paused = !paused; e.Use(); }
            }

            controls.Clear();
            GUI.matrix = Matrix4x4.TRS(inset, Quaternion.identity, Vector3.one * scale);
            displayArea = new Rect(-inset.x / scale, -inset.y / scale, Screen.width / scale, Screen.height / scale);
            bool modal = showHelp || libraryOpen;
            GUI.enabled = !modal;
            DrawBackground();
            DrawHeader();
            switch (page)
            {
                case Page.Mission: DrawMission(); break;
                case Page.Spacecraft:
                case Page.Launcher: DrawWorkshop(); break;
                case Page.Plan: DrawPlan(); break;
                case Page.Review: DrawReview(); break;
                case Page.Flight: DrawFlight(); break;
                case Page.Evidence: DrawEvidence(); break;
                case Page.Atlas: DrawAtlas(); break;
                case Page.Science: DrawScience(); break;
                case Page.Replay: DrawReplay(); break;
                case Page.Trials: DrawTrials(); break;
            }
            DrawFooter();
            GUI.enabled = true;
            if (modal)
            {
                controls.Clear();
                Box(displayArea, new Color(0, 0, 0, .65f));
                if (showHelp) DrawHelp();
                else DrawLibrary(page == Page.Spacecraft);
            }
            if (e.type == EventType.Repaint) lastControls = controls.Distinct().ToArray();
            GUI.matrix = Matrix4x4.identity;
            if (pageScrollMax > 0)
            {
                Box(new Rect(Screen.width - 20, 0, 20, Screen.height), Panel);
                pageScroll = GUI.VerticalScrollbar(new Rect(Screen.width - 18, 0, 18, Screen.height),
                    pageScroll, Screen.height, 0, pageScrollMax + Screen.height);
                // Lists and the camera consume their own wheel events before this point.
                if (e.type == EventType.ScrollWheel && !modal)
                {
                    pageScroll = Mathf.Clamp(pageScroll + e.delta.y * 28, 0, pageScrollMax);
                    e.Use();
                }
                if (e.type == EventType.KeyDown && GUI.GetNameOfFocusedControl() == "" && !modal &&
                    (e.keyCode == KeyCode.PageDown || e.keyCode == KeyCode.PageUp))
                {
                    pageScroll = Mathf.Clamp(pageScroll + (e.keyCode == KeyCode.PageDown ? 1 : -1) * Screen.height * .8f, 0, pageScrollMax);
                    e.Use();
                }
            }
            activated = null;
        }

        void ToggleFullscreen()
        {
            if (Screen.fullScreen)
                Screen.SetResolution(windowWidth, windowHeight, FullScreenMode.Windowed);
            else
            {
                windowWidth = Screen.width;
                windowHeight = Screen.height;
                Resolution desktop = Screen.currentResolution;
                Screen.SetResolution(desktop.width, desktop.height, FullScreenMode.FullScreenWindow);
            }
        }

        void DrawBackground()
        {
            if (!hasViewport) { Box(displayArea, Base); return; }
            if (view.Texture != null) GUI.DrawTexture(activeView, view.Texture, ScaleMode.StretchToFill, false);
            Box(new Rect(displayArea.x, displayArea.y, displayArea.width, activeView.y - displayArea.y), Base);
            Box(new Rect(displayArea.x, activeView.yMax, displayArea.width, displayArea.yMax - activeView.yMax), Base);
            Box(new Rect(displayArea.x, activeView.y, activeView.x - displayArea.x, activeView.height), Base);
            Box(new Rect(activeView.xMax, activeView.y, displayArea.xMax - activeView.xMax, activeView.height), Base);
        }

        void DrawHeader()
        {
            Text(34, 22, 290, 31, "O R B I T A L", heading, Ink);
            Text(36, 54, 300, 17, "FLIGHT ENGINEERING PROGRAM", mono, Mint);
            Text(902, 24, 345, 22, "EARTH SYSTEMS LAB     /     FLIGHT 01", mono, Muted);
            Text(902, 49, 183, 22, "BUILD " + Review.Version, small, Muted);
            Box(new Rect(34, 80, 1212, 1), Border);
            var tabs = new[] { Page.Mission, Page.Spacecraft, Page.Launcher, Page.Plan, Page.Review, Page.Flight, Page.Evidence, Page.Atlas };
            var names = new[] { "Mission", "Spacecraft", "Launcher", "Flight plan", "Review", "Flight", "Evidence", "Atlas" };
            for (int i = 0; i < tabs.Length; i++)
            {
                Page target = tabs[i];
                bool enabled = (target != Page.Flight && target != Page.Evidence) || flight != null;
                if (Button(new Rect(34 + i * 152, 94, 148, 34), "nav-" + i, names[i], page == target, enabled)) Go(target);
            }
        }

        void DrawFooter()
        {
            Box(new Rect(34, 675, 1212, 1), Border);
            Text(34, 684, 970, 26, string.IsNullOrEmpty(notice) ? "TAB / SHIFT+TAB focus    ENTER select    ESC back or pause    CTRL+Z / Y undo / redo" : notice,
                small, string.IsNullOrEmpty(notice) ? Muted : Orange);
            Text(1008, 685, 144, 25, fps + " FPS   •   LOCAL", mono, Muted);
            if (Button(new Rect(1157, 681, 89, 29), "help", "Controls", showHelp)) showHelp = !showHelp;
        }

        void DrawHelp()
        {
            Box(new Rect(260, 206, 760, 332), Base);
            Card(new Rect(260, 206, 760, 332), "FLIGHT DECK CONTROLS");
            Text(285, 255, 710, 205, "F11 or Alt+Enter toggles fullscreen. Use the right scrollbar or Page Up/Down in short windows.\nTab and Shift+Tab move focus. Enter activates the focused button.\nDrag the viewport to orbit the camera. Scroll to zoom.\nClick a catalogue item, then Confirm snap. Drag staging rows to reorder, or use their buttons.\nCtrl+Z and Ctrl+Y undo and redo blueprint edits.\nSpace pauses flight. Select a time rate to advance.\nReview and telemetry exports are saved on this computer.", body, Ink);
            if (Button(new Rect(285, 471, 170, 38), "help-close", "Close controls")) showHelp = false;
        }

        void Styles()
        {
            if (body != null) return;
            body = Style(17, FontStyle.Normal, true);
            small = Style(14, FontStyle.Normal, true);
            heading = Style(25, FontStyle.Bold, true);
            hero = Style(42, FontStyle.Bold, true);
            mono = Style(12, FontStyle.Bold, false);
            button = new GUIStyle(GUI.skin.button) { fontSize = 14, fontStyle = FontStyle.Bold, wordWrap = false };
            foreach (GUIStyleState state in new[] { button.normal, button.active, button.hover, button.focused })
            { state.background = null; state.textColor = Ink; }
            field = new GUIStyle(GUI.skin.textField) { fontSize = 15, padding = new RectOffset(9, 9, 5, 5) };
        }

        static GUIStyle Style(int size, FontStyle weight, bool wrap) =>
            new GUIStyle(GUI.skin.label) { fontSize = size, fontStyle = weight, wordWrap = wrap, richText = false,
                padding = new RectOffset(), alignment = TextAnchor.UpperLeft };

        static void Box(Rect r, Color color)
        {
            if (r.width <= 0 || r.height <= 0) return;
            Color previous = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(r, Texture2D.whiteTexture);
            GUI.color = previous;
        }

        void Text(float x, float y, float w, float h, string value, GUIStyle style, Color color)
        {
            style.normal.textColor = color;
            GUI.Label(new Rect(x, y, w, h), value ?? "", style);
        }

        void Card(Rect r, string title)
        {
            Box(r, Panel);
            Box(new Rect(r.x, r.y, r.width, 1), Border);
            Text(r.x + 15, r.y + 14, r.width - 30, 22, title, mono, Mint);
        }

        bool Button(Rect r, string id, string label, bool active = false, bool enabled = true)
        {
            enabled &= GUI.enabled;
            if (enabled) controls.Add(id);
            bool hover = r.Contains(Event.current.mousePosition);
            Box(r, active ? OrbitalView.ColorOf(0x244d50) : hover && enabled ? OrbitalView.ColorOf(0x284553) : Raised);
            if (active || focus == id)
                Box(new Rect(r.x, r.yMax - (focus == id ? 3 : 2), r.width, focus == id ? 3 : 2), Mint);
            bool previous = GUI.enabled;
            GUI.enabled = previous && enabled;
            button.normal.textColor = enabled ? Ink : Muted;
            bool clicked = GUI.Button(r, label, button);
            GUI.enabled = previous;
            if (enabled && (clicked || activated == id))
            {
                activated = null;
                focus = id;
                return true;
            }
            return false;
        }

        void Metric(float x, float y, float w, string label, string value, Color? color = null)
        {
            Text(x, y, w, 20, label, mono, Muted);
            Text(x, y + 19, w, 35, value, heading, color ?? Ink);
        }

        static string N(double value, string format = "F1") => double.IsNaN(value) || double.IsInfinity(value) ? "Unavailable"
            : value.ToString(format, CultureInfo.InvariantCulture);

        void Capture()
        {
            try
            {
                Directory.CreateDirectory(Persistence.Folder);
                string name = $"ORBITAL-{page}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.png";
                ScreenCapture.CaptureScreenshot(Persistence.PathFor(name));
                notice = "Captured " + name;
            }
            catch (Exception error) { notice = "Screenshot failed. " + error.Message; }
        }

        void ExportEvidence(Review model, Flight result = null)
        {
            try
            {
                exportPath = Persistence.Export(model, result);
                notice = "Saved " + Path.GetFileName(exportPath);
                Application.OpenURL(new Uri(exportPath).AbsoluteUri);
            }
            catch (Exception error) { notice = "Export failed. " + error.Message; }
        }
    }
}
