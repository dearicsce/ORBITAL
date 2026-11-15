using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Orbital
{
    public sealed partial class OrbitalGame
    {
        sealed class PartChoice
        {
            public readonly string Slot, Name, Description;
            public readonly Func<Blueprint, bool> IsInstalled;
            public readonly Action<Blueprint> Install;
            public PartChoice(string slot, string name, string description, Func<Blueprint, bool> fitted, Action<Blueprint> install)
            { Slot = slot; Name = name; Description = description; IsInstalled = fitted; Install = install; }
        }

        static readonly PartChoice[] SpaceParts =
        {
            new PartChoice("Battery","Compact battery","64 Wh usable",b=>b.battery==0,b=>b.battery=0),
            new PartChoice("Battery","Extended battery","145 Wh usable",b=>b.battery==1,b=>b.battery=1),
            new PartChoice("Battery","Endurance battery","260 Wh usable",b=>b.battery==2,b=>b.battery=2),
            new PartChoice("Array","Twin solar wings","270 W illuminated",b=>b.array==0,b=>b.array=0),
            new PartChoice("Array","High output wings","360 W illuminated",b=>b.array==1,b=>b.array=1),
            new PartChoice("Payload","Optical survey camera","Daylight imaging",b=>b.payload==0,b=>b.payload=0),
            new PartChoice("Payload","Mass dummy","Training ballast",b=>b.payload==1,b=>b.payload=1),
            new PartChoice("Antenna","Tracking dish","2 MB/s in contact",b=>b.antenna==0,b=>b.antenna=0),
            new PartChoice("Antenna","Blank mount","Radio disconnected",b=>b.antenna==1,b=>b.antenna=1),
            new PartChoice("Recorder","Survey recorder","540 MB capacity",b=>b.recorder==0,b=>b.recorder=0),
            new PartChoice("Recorder","Compact recorder","180 MB capacity",b=>b.recorder==1,b=>b.recorder=1),
        };

        static readonly PartChoice[] RocketParts =
        {
            new PartChoice("Lower tank","Core tank / C115","115 t RP-1/LOX",b=>b.lowerTank==0,b=>b.lowerTank=0),
            new PartChoice("Lower tank","Core tank / C122","122 t RP-1/LOX",b=>b.lowerTank==1,b=>b.lowerTank=1),
            new PartChoice("Upper tank","Orbiter tank / U28","28 t RP-1/LOX",b=>b.upperTank==0,b=>b.upperTank=0),
            new PartChoice("Upper tank","Orbiter tank / U30","30 t RP-1/LOX",b=>b.upperTank==1,b=>b.upperTank=1),
            new PartChoice("Upper tank","Methane test article","28 t CH₄/LOX",b=>b.upperTank==2,b=>b.upperTank=2),
            new PartChoice("Upper engine","Vacuum engine / V42","420 kN • 350 s",b=>b.engine==0,b=>b.engine=0),
            new PartChoice("Upper engine","Vacuum engine / V44","440 kN • 350 s",b=>b.engine==1,b=>b.engine=1),
            new PartChoice("Fairing","Wide fairing","2.80 m inner width",b=>b.fairing==0,b=>b.fairing=0),
            new PartChoice("Fairing","Slim fairing","1.85 m inner width",b=>b.fairing==1,b=>b.fairing=1),
            new PartChoice("Boosters","Symmetric booster pair","Two linked mounts",b=>b.boosters==1,b=>b.boosters=1),
            new PartChoice("Boosters","Unoccupied mounts","Core engine only",b=>b.boosters==0,b=>b.boosters=0),
        };

        PartChoice pending, dragging;
        Blueprint preview;
        int dragStage = -1;
        Vector2 workshopScroll;
        static readonly string[] OverlayLabels = { "Assembly", "Power", "Propulsion", "Mass / thrust", "Comms", "Interfaces" };

        Blueprint PendingDesign() => preview ?? design;

        void SelectPart(PartChoice choice)
        {
            pending = choice;
            component = choice.Slot;
            preview = design.Copy();
            choice.Install(preview);
        }

        string PlacementIssue()
        {
            if (preview == null) return "";
            Vehicle v = new Vehicle(preview);
            if (!v.CompatibleFuel) return "Upper socket rejected. The vacuum engine requires RP-1/LOX.";
            if (v.FairingWidth < v.PayloadWidth) return "The payload would intersect the fairing. Use the wide shell.";
            return "";
        }

        void ConfirmPart()
        {
            if (pending == null) return;
            string issue = PlacementIssue();
            if (!string.IsNullOrEmpty(issue)) { notice = issue; return; }
            string name = pending.Name;
            Change(pending.Install);
            CancelPart();
            notice = name + " snapped to the " + component.ToLowerInvariant() + " socket.";
        }

        void CancelPart() { pending = null; preview = null; dragging = null; }

        void DrawWorkshop()
        {
            bool ship = page == Page.Spacecraft;
            Card(new Rect(34, 161, 224, 433), ship ? "SPACECRAFT CATALOGUE" : "LAUNCHER CATALOGUE");
            GUI.SetNextControlName("parts-search");
            search = GUI.TextField(new Rect(48, 195, 196, 30), search, 80, field);
            if (string.IsNullOrEmpty(search) && GUI.GetNameOfFocusedControl() != "parts-search")
                Text(58, 202, 169, 22, "Search category or part", small, Muted);
            var choices = (ship ? SpaceParts : RocketParts).Where(c =>
                c.Name.IndexOf(search, StringComparison.OrdinalIgnoreCase) >= 0 || c.Slot.IndexOf(search, StringComparison.OrdinalIgnoreCase) >= 0).ToArray();
            workshopScroll = GUI.BeginScrollView(new Rect(44, 236, 206, 345), workshopScroll,
                new Rect(0, 0, 186, Math.Max(341, choices.Length * 58)));
            for (int i = 0; i < choices.Length; i++)
            {
                PartChoice choice = choices[i];
                var row = new Rect(0, 58 * i, 185, 52);
                Event e = Event.current;
                if (GUI.enabled && e.type == EventType.MouseDown && e.button == 0 && row.Contains(e.mousePosition))
                    dragging = choice;
                if (Button(row, "choice-" + choice.Name, "", choice == pending || choice.IsInstalled(design))) SelectPart(choice);
                DrawSilhouette(row.x + 8, row.y + 12, choice.Slot);
                Text(row.x + 34, row.y + 7, 149, 20, choice.Name, small, Ink);
                Text(row.x + 34, row.y + 28, 149, 20, choice.Description, mono, choice.IsInstalled(design) ? Mint : Muted);
            }
            GUI.EndScrollView();
            Event evt = Event.current;
            if (GUI.enabled && dragging != null && evt.type == EventType.MouseDrag && Viewport.Contains(evt.mousePosition))
            {
                SelectPart(dragging);
                evt.Use();
            }
            if (dragging != null && evt.rawType == EventType.MouseUp)
            {
                if (Viewport.Contains(evt.mousePosition) && pending == dragging) ConfirmPart();
                dragging = null;
            }

            Card(new Rect(984, 161, 262, 433), pending == null ? "CONTEXT INSPECTOR" : "SNAP PREVIEW");
            DrawViewportTrim(ship ? "01 / SPACECRAFT ASSEMBLY" : "02 / ORBITAL LAUNCHER HANGAR");
            for (int i = 0; i < OverlayLabels.Length; i++)
            {
                int n = i;
                if (Button(new Rect(281 + i * 112, 200, 106, 30), "overlay-" + i, OverlayLabels[i], overlay == (Overlay)i))
                {
                    overlay = (Overlay)n;
                    if (overlay == Overlay.Power || overlay == Overlay.Comms)
                    {
                        if (!ship) { Go(Page.Spacecraft); overlay = (Overlay)n; }
                        component = overlay == Overlay.Power ? "Battery" : "Antenna";
                    }
                    else if ((overlay == Overlay.Propulsion || overlay == Overlay.Mass) && ship)
                    {
                        Go(Page.Launcher);
                        overlay = (Overlay)n;
                        component = overlay == Overlay.Mass ? "Lower tank" : "Upper feed";
                    }
                }
            }

            DrawXray(ship);
            DrawInspector(ship);
            DrawWorkshopTools(ship);
            CameraInput(Viewport);
        }

        void DrawSilhouette(float x, float y, string slot)
        {
            Color color = Muted;
            if (slot == "Array")
            {
                Box(new Rect(x, y + 8, 21, 12), Mint);
                Box(new Rect(x + 6, y + 8, 1, 12), Panel);
                Box(new Rect(x + 14, y + 8, 1, 12), Panel);
            }
            else
            {
                Box(new Rect(x + 5, y + 5, 12, 22), color);
                Box(new Rect(x + 3, y + 5, 16, 3), Ink);
                if (slot == "Battery") Box(new Rect(x + 8, y + 2, 6, 4), Mint);
                else if (slot == "Upper engine") Box(new Rect(x + 1, y + 21, 20, 5), Orange);
                else Box(new Rect(x + 5, y + 17, 12, 3), Border);
            }
        }

        void DrawViewportTrim(string label)
        {
            Box(new Rect(activeView.x, activeView.y, activeView.width, 1), Border);
            Box(new Rect(activeView.x, activeView.yMax - 1, activeView.width, 1), Border);
            Box(new Rect(activeView.x + 10, activeView.y + 10, 270, 24), Base);
            Text(activeView.x + 19, activeView.y + 15, 255, 20, label, mono, Mint);
        }

        void DrawXray(bool ship)
        {
            Vehicle v = review.Vehicle;
            if (overlay == Overlay.Power && ship)
            {
                Wire("Array", "Bus", v.SolarConnected, "generation");
                Wire("Battery", "Bus", v.BatteryConnected, "reserve");
                Wire("Bus", "Payload", true, "load");
                Tag("Array", "ARRAY", v.SolarConnected);
                Tag("Battery", "BATTERY", v.BatteryConnected);
                Tag("Bus", "AVIONICS", true);
            }
            else if (overlay == Overlay.Propulsion && !ship)
            {
                Wire("Upper tank", "Upper engine", v.FeedConnected && v.CompatibleFuel, "feed");
                Tag("Upper tank", "UPPER TANK", v.CompatibleFuel);
                Tag("Upper feed", v.FeedConnected ? "FEED" : "OPEN FEED", v.FeedConnected && v.CompatibleFuel);
                Tag("Upper engine", "ENGINE", true);
                Tag("Lower tank", "CORE GROUP", true);
            }
            else if (overlay == Overlay.Mass && !ship)
            {
                Vector2 anchor = Unscale(view.WorldAnchor("Lower tank"));
                if (float.IsFinite(anchor.x))
                {
                    double centre = v.Centre(v.LowerFuel, v.UpperFuel, true, true);
                    double burnout = v.Centre(0, v.UpperFuel, true, true);
                    Vector2 com = anchor + new Vector2(-65, (float)(16 - centre) * 10);
                    PlotLine(com, com + new Vector2(0, -53), Mint, 3);
                    PlotLine(com, com + new Vector2(32, 8), Mint, 1);
                    Box(new Rect(com.x - 4, com.y - 4, 8, 8), Orange);
                    Box(new Rect(com.x - 4, com.y + (float)(centre - burnout) * 10, 8, 8), Muted);
                    Text(com.x - 102, com.y - 74, 150, 24, "RESULTANT THRUST ↑", mono, Mint);
                    Text(com.x - 87, com.y + 7, 150, 24, "COM / FULL", mono, Orange);
                    Text(com.x - 87, com.y + (float)(centre - burnout) * 10 - 15, 150, 24, "COM / CORE EMPTY", mono, Muted);
                }
                Tag("Upper engine", v.Offset == 0 ? "CENTERLINE" : "OFF AXIS", v.Offset == 0);
            }
            else if (overlay == Overlay.Comms && ship)
            {
                Wire("Bus", "Antenna", v.AntennaConnected, "command / downlink");
                Tag("Antenna", v.AntennaConnected ? "GROUND STATION" : "NO ANTENNA", v.AntennaConnected);
            }
            else if (overlay == Overlay.Structure)
            {
                if (ship)
                {
                    Tag("Battery", "BATTERY BAY", true);
                    Tag("Payload", "PAYLOAD MOUNT", true);
                }
                else
                {
                    Tag("Staging", "STAGE FLANGE", v.StageOrder);
                    Tag("Fairing", "FAIRING SOCKET", v.FairingWidth >= v.PayloadWidth);
                    Tag("Upper engine", "ENGINE SOCKET", v.Offset == 0);
                }
            }
            if (pending != null)
            {
                Box(new Rect(283, 535, 678, 45), Base);
                Text(294, 548, 448, 24, PlacementIssue().Length == 0 ? "PREVIEW / " + pending.Name : PlacementIssue(), small, Orange);
                if (Button(new Rect(746, 541, 120, 31), "snap", "Confirm snap", false, PlacementIssue().Length == 0)) ConfirmPart();
                if (Button(new Rect(874, 541, 76, 31), "snap-cancel", "Cancel")) CancelPart();
            }
            else
            {
                Box(new Rect(281, 559, 468, 24), Base);
                Text(289, 564, 450, 20, "DRAG TO ORBIT   •   SCROLL TO ZOOM   •   SELECT ANNOTATIONS", mono, Muted);
            }
        }

        void Wire(string from, string to, bool connected, string label)
        {
            Vector2 a = Unscale(view.WorldAnchor(from)), b = Unscale(view.WorldAnchor(to));
            if (!float.IsFinite(a.x) || !float.IsFinite(b.x) || !Viewport.Contains(a) || !Viewport.Contains(b)) return;
            if (connected)
            {
                PlotLine(a, b, Mint, 2);
                Vector2 head = Vector2.Lerp(a, b, .68f), along = (b - a).normalized;
                Vector2 cross = new Vector2(-along.y, along.x);
                PlotLine(head, head - along * 8 + cross * 4, Mint, 1);
                PlotLine(head, head - along * 8 - cross * 4, Mint, 1);
            }
            else
            {
                PlotLine(a, Vector2.Lerp(a, b, .4f), Red, 2);
                PlotLine(Vector2.Lerp(a, b, .6f), b, Red, 2);
                Vector2 mid = (a + b) / 2;
                Text(mid.x - 12, mid.y - 10, 65, 22, "× OPEN", mono, Red);
            }
        }

        void Tag(string name, string label, bool good)
        {
            Vector2 p = Unscale(view.WorldAnchor(name));
            if (!float.IsFinite(p.x) || !Viewport.Contains(p)) return;
            float shift = name == "Battery" || name == "Fairing" || name == "Upper engine" || name == "Array" ? 27 : -116;
            float y = p.y + (name == "Battery" ? 34 : name == "Bus" ? -49 : name == "Array" ? -31 : -14);
            float width = Math.Max(82, button.CalcSize(new GUIContent(label)).x + 12);
            var r = new Rect(Mathf.Clamp(p.x + shift, 286, 958 - width), Mathf.Clamp(y, 238, 525), width, 26);
            PlotLine(p, new Vector2(shift > 0 ? r.x : r.xMax, r.center.y), good ? Mint : Red, 1);
            Box(new Rect(p.x - 3, p.y - 3, 6, 6), good ? Mint : Red);
            if (Button(r, "tag-" + name, label, component == name)) component = name;
        }

        void DrawInspector(bool ship)
        {
            Vehicle v = review.Vehicle;
            Text(999, 199, 234, 33, component, heading, Ink);
            string summary;
            string detail;
            if (pending != null)
            {
                summary = pending.Name + "\n" + pending.Description;
                detail = PlacementIssue().Length == 0 ? "Compatible socket. Confirm to replace the installed component." : PlacementIssue();
            }
            else if (overlay == Overlay.Power)
            {
                double shadow = review.Forecast?.LongestDark ?? double.NaN;
                Check row = review.Checks.First(c => c.Name == "Battery reserve");
                summary = $"{N(v.Solar, "F0")} W  illuminated output\n{N(v.DarkLoad, "F0")} W  eclipse draw\n{N(v.Battery, "F0")} Wh  usable battery";
                detail = $"{N(shadow / 60)} min predicted shadow\n{N(row.Value)} Wh predicted minimum\n{N(Vehicle.Reserve, "F0")} Wh policy reserve";
            }
            else if (overlay == Overlay.Propulsion)
            {
                summary = $"Core   {N(v.LowerThrust/1000, "F0")} kN / {Vehicle.LowerIsp} s\nUpper   {N(v.UpperThrust/1000, "F0")} kN / {Vehicle.UpperIsp} s\n{N((v.LowerFuel+v.UpperFuel)/1000)} t usable propellant";
                detail = $"Wet {N(v.Wet/1000)} t   Dry {N(v.Dry/1000)} t\nCore ideal Δv {N(v.LowerDeltaV, "F0")} m/s\nUpper ideal Δv {N(v.UpperDeltaV, "F0")} m/s\nUpper feed " + (v.FeedConnected && v.CompatibleFuel ? "valid" : "invalid");
            }
            else if (overlay == Overlay.Mass)
            {
                summary = $"Pad mass {N(v.Wet/1000)} t\nCore dry + wet above {N((v.Wet-v.LowerFuel)/1000)} t\nPad TWR {N(v.TWR, "F2")}";
                detail = $"COM full {N(v.Centre(v.LowerFuel, v.UpperFuel, true, true))} m\nCore empty {N(v.Centre(0, v.UpperFuel, true, true))} m\nUpper only {N(v.Centre(0, v.UpperFuel, false, false))} m above upper base\nUpper offset torque {N(v.Torque, "F0")} N·m";
            }
            else if (overlay == Overlay.Comms)
            {
                var link = review.Insertion == null ? ((double elevation, double delay, bool occulted, bool visible)?)null
                    : Physics.Link(review.Insertion.r, review.Insertion.seconds);
                summary = $"Target   Earth station 01\nTracking   {(v.AntennaConnected ? "station LOS" : "disconnected")}\nRate   {N(v.RadioRate, "F0")} MB/s";
                detail = $"At insertion: {(link == null ? "unavailable" : link.Value.occulted ? "Earth occultation" : link.Value.visible ? "contact" : "below 8° mask")}\nRange delay {N((link?.delay ?? double.NaN) * 1000, "F2")} ms\nFlight separates sent and confirmed.";
            }
            else if (overlay == Overlay.Structure)
            {
                summary = $"Fairing ID {N(v.FairingWidth, "F2")} m\nPayload envelope {N(v.PayloadWidth, "F2")} m\nStaging {(v.StageOrder ? "valid" : "invalid")}";
                detail = "Visible markers identify constrained mount interfaces. A clear envelope permits payload stowage.";
            }
            else
            {
                summary = $"Wet mass {N(v.Wet/1000)} t\nSpacecraft {N(v.PayloadMass, "F0")} kg\nCost {N(v.Cost, "F0")} / {Vehicle.Budget} credits";
                detail = "Select an X-ray overlay to inspect the installed configuration.";
            }
            Text(999, 242, 230, 106, summary, body, Ink);
            Box(new Rect(999, 342, 230, 1), Border);
            Text(999, 357, 230, 117, detail, small, Muted);

            if (pending != null) return;
            if (ship)
            {
                if (Button(new Rect(999, 491, 232, 33), "battery-breaker", design.batteryOpen ? "Close battery breaker" : "Open battery breaker"))
                { Change(b => b.batteryOpen = !b.batteryOpen); component = "Battery"; overlay = Overlay.Power; }
                if (Button(new Rect(999, 532, 232, 33), "array-breaker", design.arrayOpen ? "Close array breaker" : "Open array breaker"))
                { Change(b => b.arrayOpen = !b.arrayOpen); component = "Array"; overlay = Overlay.Power; }
            }
            else
            {
                if (Button(new Rect(999, 473, 232, 30), "feed-breaker", design.feedOpen ? "Reconnect upper feed" : "Disconnect upper feed"))
                { Change(b => b.feedOpen = !b.feedOpen); component = "Upper feed"; overlay = Overlay.Propulsion; }
                if (Button(new Rect(999, 510, 232, 30), "align", design.engineOffset ? "Snap engine to centre" : "Inspect off-axis engine"))
                { Change(b => b.engineOffset = !b.engineOffset); component = "Upper engine"; overlay = Overlay.Mass; }
                if (Button(new Rect(999, 547, 232, 30), "isolate", new[] { "Isolate core", "Isolate upper", "Show all sections" }[isolation]))
                    isolation = (isolation + 1) % 3;
            }
        }

        void DrawWorkshopTools(bool ship)
        {
            int x = 34;
            foreach (var item in new[] { "Undo", "Redo", "Explode", "Cutaway", "Front", "Oblique", "Library" })
            {
                string tool = item;
                bool enabled = tool != "Undo" || undo.Count > 0;
                enabled &= tool != "Redo" || redo.Count > 0;
                if (Button(new Rect(x, 608, 83, 30), "tool-" + tool, tool,
                    (tool == "Explode" && exploded) || (tool == "Cutaway" && cutaway), enabled))
                {
                    switch (tool)
                    {
                        case "Undo": Undo(); break;
                        case "Redo": Redo(); break;
                        case "Explode": exploded = !exploded; break;
                        case "Cutaway": cutaway = !cutaway; break;
                        case "Front": view.yaw = 0; view.pitch = 0; break;
                        case "Oblique": view.yaw = 20; view.pitch = 12; break;
                        case "Library": libraryOpen = !libraryOpen; break;
                    }
                }
                x += 90;
            }

            if (ship)
            {
                Text(689, 617, 355, 28, $"REV {review.Revision.Substring(0, 12)}   •   {review.Checks.Count(c=>c.Status==Verdict.Blocker)} BLOCKERS", mono, Muted);
                if (Button(new Rect(1051, 604, 195, 37), "next-launcher", "Continue to launcher")) Go(Page.Launcher);
                return;
            }

            string[] ordered = Staging.Sequences[design.stagingOrder];
            for (int i = 0; i < 3; i++)
            {
                int index = i;
                var r = new Rect(669 + i * 139, 607, 133, 31);
                Event e = Event.current;
                if (GUI.enabled && e.type == EventType.MouseDown && r.Contains(e.mousePosition)) dragStage = i;
                if (GUI.enabled && e.rawType == EventType.MouseUp && r.Contains(e.mousePosition) && dragStage >= 0 && dragStage != i)
                {
                    var reordered = ordered.ToList();
                    string moved = reordered[dragStage];
                    reordered.RemoveAt(dragStage);
                    reordered.Insert(index, moved);
                    Change(b => b.stagingOrder = Array.FindIndex(Staging.Sequences, s => s.SequenceEqual(reordered)));
                    dragStage = -1;
                    e.Use();
                }
                if (Button(r, "stage-" + i, ordered[i], dryRun >= 0 && Math.Min(2, (int)(dryRun / 1.55)) == i))
                {
                    string selected = ordered[i];
                    Change(b => b.stagingOrder = selected == "Payload release" ? (b.stagingOrder == 4 ? 0 : 4)
                        : selected == "Upper ignition" ? (b.stagingOrder == 2 ? 0 : 2) : 0);
                }
            }
            if (Event.current.rawType == EventType.MouseUp) dragStage = -1;
            if (Button(new Rect(1092, 607, 154, 31), "dry-run", "Dry-run staging", dryRun >= 0, review.Vehicle.StageOrder)) dryRun = 0;
            string action = dryRun < 0 ? "Drag staging events to check order. Click lower separation to restore the baseline sequence."
                : dryRun < 1.5 ? "Dry run • Lower engine burnout and separation"
                : dryRun < 3.2 ? "Dry run • Upper engine ignition and fairing clearance"
                : "Dry run • Upper cutoff and payload release";
            Text(670, 647, 576, 22, action, small, dryRun < 0 ? Muted : Mint);
        }

        void DrawLibrary(bool ship)
        {
            var entries = ship ? profile.spacecraft : profile.rockets;
            Card(new Rect(376, 249, 490, 303), ship ? "SPACECRAFT BLUEPRINTS" : "LAUNCHER BLUEPRINTS");
            libraryName = GUI.TextField(new Rect(394, 288, 284, 32), libraryName, 36, field);
            if (Button(new Rect(692, 288, 154, 32), "library-save", "Save as new", false, entries.Count < 24 && !string.IsNullOrWhiteSpace(libraryName)))
            {
                entries.Add(new NamedBlueprint { name = libraryName.Trim(), design = design.Copy() });
                SaveProfile();
            }
            listScroll = GUI.BeginScrollView(new Rect(391, 333, 453, 164), listScroll, new Rect(0, 0, 427, Math.Max(163, entries.Count * 34)));
            for (int i = 0; i < entries.Count; i++)
            {
                var entry = entries[i];
                if (Button(new Rect(0, 34 * i, 343, 30), "library-load-" + i, entry.name))
                    Change(b => CopySection(b, entry.design, ship));
                if (Button(new Rect(351, 34 * i, 72, 30), "library-delete-" + i, "Delete"))
                { entries.RemoveAt(i); SaveProfile(); break; }
            }
            GUI.EndScrollView();
            if (Button(new Rect(695, 507, 150, 31), "library-close", "Close library")) libraryOpen = false;
        }

        static void CopySection(Blueprint to, Blueprint from, bool ship)
        {
            if (ship)
            {
                to.battery = from.battery; to.array = from.array; to.batteryOpen = from.batteryOpen; to.arrayOpen = from.arrayOpen;
                to.payload = from.payload; to.antenna = from.antenna; to.recorder = from.recorder;
            }
            else
            {
                to.lowerTank = from.lowerTank; to.upperTank = from.upperTank; to.engine = from.engine; to.fairing = from.fairing;
                to.boosters = from.boosters; to.feedOpen = from.feedOpen; to.engineOffset = from.engineOffset;
                to.upperFirst = from.upperFirst; to.payloadFirst = from.payloadFirst; to.stagingOrder = from.stagingOrder;
            }
        }

        void CameraInput(Rect area)
        {
            if (showHelp || libraryOpen || !GUI.enabled || dragging != null || dragStage >= 0) return;
            Event e = Event.current;
            if (!area.Contains(e.mousePosition)) return;
            if (e.type == EventType.ScrollWheel)
            {
                view.zoom = Mathf.Clamp(view.zoom + e.delta.y * .042f, .66f, 1.75f);
                e.Use();
            }
            if (e.type == EventType.MouseDrag && (e.button == 0 || e.button == 1))
            {
                view.ApplyOrbitDrag(e.delta.x, -e.delta.y);
                e.Use();
            }
        }

        static void PlotLine(Vector2 a, Vector2 b, Color color, float thickness)
        {
            var before = GUI.matrix;
            Vector2 d = b - a;
            GUIUtility.RotateAroundPivot(Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg, a);
            Box(new Rect(a.x, a.y - thickness / 2, d.magnitude, thickness), color);
            GUI.matrix = before;
        }
    }
}
