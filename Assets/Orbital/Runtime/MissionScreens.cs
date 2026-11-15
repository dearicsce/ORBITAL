using System;
using System.IO;
using System.Linq;
using UnityEngine;

namespace Orbital
{
    public sealed partial class OrbitalGame
    {
        float evidenceHeight = 600;
        bool engineeringDetails;
        void DrawMission()
        {
            Text(34, 148, 740, 34, "MISSION CONTROL / BRIEFING", heading, Ink);
            DrawViewportTrim("EARTH NEIGHBOURHOOD  /  LEO");
            Text(49, 600, 652, 24, "EARTH SURFACE   NASA GODDARD SVS / RETO STÖCKLI", mono, Muted);
            Card(new Rect(823, 185, 423, 444), "CONTRACT 01    •    EARTH OBSERVATION");
            Text(845, 231, 380, 62, "Floodwatch", hero, Ink);
            Text(845, 299, 373, 95, "Design a daylight survey spacecraft, insert it into low Earth orbit, and deliver observations during ground contact.", body, Ink);
            Metric(845, 386, 176, "DELIVERY TARGET", "300 MB");
            Metric(1031, 386, 184, "RESERVE FLOOR", "22 Wh");
            Text(845, 457, 377, 58, "Start with the compact battery. Inspect its eclipse reserve, fit the extended unit, and compare the review against recorded telemetry.", small, Muted);
            if (Button(new Rect(845, 526, 376, 44), "mission-build", "Enter spacecraft workshop", true)) Go(Page.Spacecraft);
            if (flight != null && Button(new Rect(845, 578, 183, 35), "mission-resume", flight.State.finished ? "Open last debrief" : "Resume flight"))
                Go(flight.State.finished ? Page.Evidence : Page.Flight);
            Text(34, 643, 660, 22, profile.completed || profile.browserCompleted.Contains(Review.Mission)
                ? "FLOODWATCH COMPLETE   •   CAMPAIGN RECORD SAVED" : "FLIGHT 01   •   AWAITING VEHICLE REVIEW", mono, Mint);
            Text(893, 643, 353, 22, $"{profile.coins + (long)profile.browserWallet} CREDITS   •   MISSION LEDGER", mono, Muted);
            CameraInput(WideViewport);
        }

        void DrawPlan()
        {
            Text(34, 148, 740, 34, "FLIGHT PLAN / EARTH INSERTION", heading, Ink);
            DrawViewportTrim("PROPAGATED TRACK  /  INERTIAL");
            Card(new Rect(823, 185, 423, 444), "LAUNCH GEOMETRY");
            Text(843, 223, 383, 63, "Set the Sun angle at launch. The same departure lighting is carried into orbital operations.", body, Ink);
            for (int i = 0; i < 3; i++)
            {
                int phase = i;
                if (Button(new Rect(843 + i * 126, 292, 119, 34), "phase-" + i,
                    new[] { "Sun −45°", "Sun 0°", "Sun +45°" }[i], design.launchPhase == i))
                    Change(b => b.launchPhase = phase);
            }
            var prediction = review.Forecast;
            var elements = prediction != null ? Physics.Elements(review.Insertion.r, review.Insertion.v) : (double.NaN, double.NaN, double.NaN);
            Metric(843, 352, 187, "PERIAPSIS", N(elements.Item1 / 1000) + " km");
            Metric(1032, 352, 187, "APOAPSIS", N(elements.Item2 / 1000) + " km");
            Metric(843, 423, 187, "LONGEST SHADOW", N((prediction?.LongestDark ?? double.NaN) / 60) + " min");
            Metric(1032, 423, 187, "STATION ACCESS", N(prediction?.ContactSeconds ?? double.NaN, "F0") + " s");
            Text(843, 493, 379, 67, "Prograde equatorial insertion. Spherical rotating Earth, cylindrical shadow and one ground station with an 8° elevation mask.", small, Muted);
            if (Button(new Rect(843, 574, 377, 39), "plan-review", "Continue to engineering review", true)) Go(Page.Review);
            Text(35, 645, 870, 24, "Track is integrated from the predicted terminal ascent state. Earth and track share the same scale.", small, Muted);
            if (Button(new Rect(1021, 637, 225, 32), "plan-science", "Explore the Manaus target")) Go(Page.Science);
            CameraInput(WideViewport);
        }

        void DrawReview()
        {
            Text(34, 148, 743, 38, "EVIDENCE-BASED DESIGN REVIEW", heading, Ink);
            int blockers = review.Checks.Count(c => c.Status == Verdict.Blocker);
            Text(880, 153, 366, 22, $"REV {review.Revision.Substring(0, 12)}    •    {blockers} BLOCKERS", mono, blockers == 0 ? Mint : Red);
            Card(new Rect(34, 193, 592, 394), "REVIEW CHECKS");
            Card(new Rect(640, 193, 606, 394), "TRACEABLE EVIDENCE");
            listScroll = GUI.BeginScrollView(new Rect(46, 225, 568, 350), listScroll,
                new Rect(0, 0, 547, Math.Max(347, review.Checks.Count * 37)));
            for (int i = 0; i < review.Checks.Count; i++)
            {
                Check check = review.Checks[i];
                Color accent = VerdictColor(check);
                var r = new Rect(0, i * 37, 545, 33);
                if (Button(r, "check-" + i, "", i == checkIndex))
                { checkIndex = i; component = check.Component; detailScroll = Vector2.zero; }
                Text(8, r.y + 7, 234, 22, check.Name, small, Ink);
                Text(239, r.y + 7, 182, 22, N(check.Value, "0.######") + " " + check.Units, small, Muted);
                Text(449, r.y + 9, 88, 22, check.Status.ToString().ToUpperInvariant(), mono, accent);
            }
            GUI.EndScrollView();

            Check row = review.Checks[checkIndex];
            Color color = VerdictColor(row);
            Text(655, 227, 555, 36, row.Name, heading, Ink);
            Text(655, 267, 556, 42, row.Requirement, body, Muted);
            Metric(655, 310, 174, "PREDICTED", N(row.Value, "0.###") + " " + row.Units, color);
            Metric(852, 310, 162, "THRESHOLD", N(row.Limit, "0.###") + " " + row.Units);
            Metric(1042, 310, 168, "MARGIN", N(row.Margin, "+0.###;-0.###;0") + " " + row.Units, color);
            if (Button(new Rect(655, 371, 236, 31), "engineering-details",
                engineeringDetails ? "Hide engineering details" : "Engineering details", engineeringDetails))
                engineeringDetails = !engineeringDetails;
            if (engineeringDetails)
            {
                detailScroll = GUI.BeginScrollView(new Rect(654, 409, 578, 134), detailScroll, new Rect(0, 0, 548, evidenceHeight));
                int y = 0;
                EvidenceField(ref y, "INPUTS", row.Inputs);
                EvidenceField(ref y, "CALCULATION", row.Equation);
                EvidenceField(ref y, "ASSUMPTIONS / RANGE", row.Assumptions + " " + row.Range);
                EvidenceField(ref y, "SOURCE / MODEL " + row.Version, row.Source.Replace(" | ", "\n"));
                if (row.Status != Verdict.Pass) EvidenceField(ref y, "CORRECTIVE ACTION", row.Fix);
                evidenceHeight = Math.Max(134, y);
                GUI.EndScrollView();
                if (Button(new Rect(655, 546, 236, 31), "locate-check", "Locate " + row.Component)) Locate(row);
                if (Button(new Rect(900, 546, 224, 31), "trials", "Robustness trials")) Go(Page.Trials);
            }
            Text(34, 607, 572, 45, blockers == 0 ? "All launch gates cleared for this blueprint revision." : "Resolve the listed blockers to authorize launch.", body, blockers == 0 ? Mint : Orange);
            if (Button(new Rect(818, 604, 194, 42), "export-review", "Export review dossier")) ExportEvidence(review);
            if (Button(new Rect(1025, 604, 221, 42), "commit", "Commit & launch", true, review.CanLaunch)) StartFlight();
        }

        void EvidenceField(ref int y, string name, string value)
        {
            Text(3, y, 544, 17, name, mono, Mint);
            y += 20;
            int height = Mathf.CeilToInt(small.CalcHeight(new GUIContent(value), 543));
            Text(3, y, 543, height + 5, value, small, Ink);
            y += height + 16;
        }

        static Color VerdictColor(Check row) => row.Status == Verdict.Pass ? Mint : row.Status == Verdict.Blocker ? Red : Orange;

        void Locate(Check row)
        {
            string slot = row.Component;
            bool ship = new[] { "Battery", "Antenna", "Recorder", "Payload", "Array" }.Contains(slot);
            Go(ship ? Page.Spacecraft : Page.Launcher);
            component = slot;
            if (slot == "Antenna") overlay = Overlay.Comms;
            else if (slot == "Upper feed" || row.Name.Contains("delta-v")) overlay = Overlay.Propulsion;
            else if (slot == "Upper engine") overlay = Overlay.Mass;
            else if (ship && slot != "Battery") overlay = Overlay.Structure;
            notice = row.Status == Verdict.Pass ? row.Requirement : row.Fix;
            if (slot == "Battery") search = "battery";
        }

        void DrawFlight()
        {
            FlightState state = flight.State;
            Operations o = state.operations;
            Ascent a = state.ascent;
            bool onPad = state.prelaunchRemaining > 0;
            Text(34, 148, 760, 38, onPad ? "FLIGHT DECK / LAUNCH PAD" :
                o == null ? "FLIGHT DECK / ASCENT" : "FLIGHT DECK / ORBITAL OPERATIONS", heading, Ink);
            DrawViewportTrim(onPad ? "VEHICLE HELD ON PAD" : o == null ? "LIVE STAGE VIEW  /  ASCENT" : "INERTIAL TRACK  /  EARTH");
            string speedLabel = onPad ? "COUNTDOWN" : $"{EffectiveRate}×{(rate != EffectiveRate ? " EVENT HOLD" : "")}";
            Card(new Rect(823, 185, 423, 444), "LIVE TELEMETRY    •    T+" + N(flight.Clock, "F0") + " s   /   " + speedLabel);
            if (o == null)
            {
                Metric(843, 226, 191, "ALTITUDE", N(a.Height / 1000) + " km");
                Metric(1040, 226, 191, "INERTIAL SPEED", N(a.v.Length, "F0") + " m/s");
                Metric(843, 300, 191, "VEHICLE MASS", N(a.mass / 1000) + " t");
                Metric(1040, 300, 191, "STAGE PROPELLANT", N(a.stageFuel / 1000) + " t");
                string phase = state.prelaunchRemaining > Flight.IgnitionHoldSeconds
                    ? $"Release countdown  T−{Math.Ceiling(state.prelaunchRemaining - Flight.IgnitionHoldSeconds):F0}"
                    : onPad ? "Ignition preview / clamps held" : a.stage == 0 ? "Stage 1 / core burn" : "Stage 2 / insertion burn";
                Text(843, 372, 375, 82, phase + "\nGuidance pitch " + N(a.pitch) + "° above the local horizon.", body, Ink);
            }
            else
            {
                Vehicle v = flight.Review.Vehicle;
                var link = Physics.Link(o.r, flight.Clock);
                bool dark = Physics.Shadow(o.r, v.Sun);
                Metric(843, 225, 190, "BATTERY", N(o.charge) + " Wh", dark ? Orange : Mint);
                Metric(1038, 225, 190, "CONFIRMED DOWNLINK", N(o.received) + " MB");
                Text(843, 293, 377, 96,
                    $"{(dark ? "ECLIPSE / battery discharging" : "SUNLIGHT / solar generation")}\n{(link.occulted ? "Earth occultation" : link.visible ? "Ground link acquired" : "Below station mask")} • {N(link.delay * 1000, "F2")} ms one way\nStored {N(o.stored)} MB  •  In flight {N(o.inFlight.Sum(p => p.size), "F2")} MB\nAltitude {N((o.r.Length - Physics.Radius)/1000)} km",
                    body, Ink);
                DrawCommand(843, 121, Subsystem.Imager, "Imager");
                DrawCommand(970, 126, Subsystem.Downlink, "Downlink");
                DrawCommand(1102, 118, Subsystem.BatteryGuard, "Auto guard");
                if (Button(new Rect(657, 585, 131, 32), "follow", follow ? "Inertial camera" : "Follow vehicle", follow)) follow = !follow;
                DrawFlightGeometry(o, link.visible);
            }
            Box(new Rect(843, 439, 377, 1), Border);
            Text(843, 452, 370, 22, "EVENT LOG", mono, Mint);
            var recent = state.events.Skip(Math.Max(0, state.events.Count - 3)).ToArray();
            for (int i = 0; i < recent.Length; i++)
                Text(843, 474 + i * 27, 373, 30, recent[i], small, Muted);
            if (state.finished)
            {
                if (Button(new Rect(843, 565, 377, 42), "finish-evidence", "Open flight debrief", true)) Go(Page.Evidence);
            }
            else
            {
                if (Button(new Rect(843, 565, 105, 39), "flight-pause", paused ? "Resume" : "Pause", paused)) paused = !paused;
                int[] speeds = { 1, 30, 120, 600 };
                for (int i = 0; i < speeds.Length; i++)
                    if (Button(new Rect(957 + i * 66, 565, 60, 39), "rate-" + i, speeds[i] + "×", rate == speeds[i], !onPad))
                    { rate = speeds[i]; paused = false; }
            }
            Text(34, 647, 1110, 22, "Warp returns to 1× for launch and separation events. Leaving Flight pauses and saves the checkpoint.", small, Muted);
            CameraInput(WideViewport);
        }

        void DrawCommand(int x, int width, Subsystem subsystem, string name)
        {
            bool request = flight.Requested(subsystem);
            var latest = flight.State.commands.LastOrDefault(c => c.subsystem == subsystem);
            bool pending = latest != null && latest.status != CommandStatus.Confirmed;
            if (Button(new Rect(x, 389, width, 34), "command-" + subsystem,
                pending ? name + " …" : name + (request ? " on" : " off"), request, !flight.State.finished && !pending))
            {
                flight.Queue(subsystem, !request);
                SaveFlight();
            }
        }

        void DrawFlightGeometry(Operations o, bool visible)
        {
            Vector2 craft = Unscale(view.OrbitPoint(view.DisplayPosition)), station = Unscale(view.OrbitPoint(Physics.Station(view.DisplayClock)));
            if (!WideViewport.Contains(craft) || !WideViewport.Contains(station)) return;
            if (visible) PlotLine(craft, station, Mint, 2);
            Text(Mathf.Clamp(craft.x + 8, 48, 682), Mathf.Clamp(craft.y - 24, 232, 550), 116, 23, "FLOODWATCH", mono, Mint);
            if (visible) Text(Mathf.Clamp(station.x + 6, 48, 682), Mathf.Clamp(station.y + 7, 232, 550), 116, 23, "GROUND 01", mono, Orange);
        }

        void DrawEvidence()
        {
            var model = flight.Review;
            var o = flight.State.operations;
            bool done = flight.State.finished;
            Text(34, 148, 735, 38, "FLIGHT EVIDENCE / DEBRIEF", heading, Ink);
            Text(934, 154, 309, 22, "FROZEN REV " + model.Revision.Substring(0, 12), mono, Mint);
            Card(new Rect(34, 193, 714, 400), "BATTERY TELEMETRY   /   WH");
            Card(new Rect(765, 193, 481, 400), done ? flight.Success ? "MISSION COMPLETE" : "OBJECTIVE MISSED" : "FLIGHT IN PROGRESS");
            DrawChargePlot(new Rect(88, 253, 632, 268), model.Vehicle.Battery);
            Text(788, 234, 162, 23, "METRIC / UNIT", mono, Mint);
            Text(949, 234, 77, 23, "MINIMUM", mono, Mint);
            Text(1028, 234, 77, 23, "FORECAST", mono, Mint);
            Text(1105, 234, 72, 23, "ACTUAL", mono, Mint);
            Text(1183, 234, 52, 23, "RESULT", mono, Mint);
            int y = 270;
            foreach (var comparison in FlightComparison.For(flight))
            {
                Box(new Rect(782, y - 4, 448, 34), Raised);
                Text(788, y, 162, 24, comparison.Metric + " / " + comparison.Unit, small, Ink);
                Text(949, y + 2, 77, 23, N(comparison.Minimum, "0.###"), mono, Muted);
                Text(1028, y + 2, 77, 23, comparison.Prediction.HasValue ? N(comparison.Prediction.Value, "0.###") : "—", mono, Muted);
                Text(1105, y + 2, 72, 23, comparison.Actual.HasValue ? N(comparison.Actual.Value, "0.###") : "—", mono, Ink);
                Text(1183, y + 2, 44, 23, comparison.Passed == true ? "PASS" : comparison.Passed == false ? "FAIL" : "—",
                    mono, comparison.Passed == true ? Mint : comparison.Passed == false ? Red : Muted);
                y += 40;
            }
            string comparisonNote = flight.State.ascent.failure;
            if (string.IsNullOrEmpty(comparisonNote))
                comparisonNote = flight.State.snapshot.expectations?.captured == true
                    ? "The launch forecast assumes the imager and downlink remain armed whenever conditions permit."
                    : "This legacy checkpoint has no captured launch forecast.";
            Text(785, 487, 429, 68, comparisonNote, small, Muted);
            if (Button(new Rect(34, 608, 196, 40), "export-evidence", "Export report + CSV", true)) ExportEvidence(model, flight);
            if (!done && Button(new Rect(241, 608, 156, 40), "evidence-resume", "Resume flight")) Go(Page.Flight);
            if (done && Button(new Rect(241, 608, 220, 40), "evidence-replay", "Restore flown blueprint"))
            {
                Change(b => { CopySection(b, model.Design, true); CopySection(b, model.Design, false); b.launchPhase = model.Design.launchPhase; });
                Go(Page.Review);
            }
            if (done && Button(new Rect(474, 608, 174, 40), "evidence-blackbox", "Replay flight")) Go(Page.Replay);
            if (o != null && Button(new Rect(827, 608, 200, 40), "evidence-science", "Science results")) Go(Page.Science);
            if (Button(new Rect(1040, 608, 206, 40), "evidence-home", "Return to mission")) Go(Page.Mission);
        }

        void DrawChargePlot(Rect chart, double capacity)
        {
            var samples = flight.State.samples;
            double duration = Math.Max(1, flight.Clock);
            double max = Math.Max(1, capacity);
            Vector2 Point(double time, double charge) => new Vector2(chart.x + (float)(time / duration) * chart.width,
                chart.yMax - (float)(charge / max) * chart.height);
            for (int i = 0; i <= 4; i++)
            {
                float y = chart.yMax - i * chart.height / 4;
                Box(new Rect(chart.x, y, chart.width, 1), Border);
                Text(44, y - 7, 43, 18, N(max * i / 4, "F0"), mono, Muted);
            }
            Vector2 floor = Point(0, Vehicle.Reserve);
            PlotLine(floor, Point(duration, Vehicle.Reserve), Orange, 1);
            for (int i = 1; i < samples.Count; i++)
                PlotLine(Point(samples[i-1].time, samples[i-1].charge), Point(samples[i].time, samples[i].charge), Mint, 2);
            Text(89, 541, 292, 22, "T+0    •    MINT RECORDED / AMBER FLOOR", mono, Muted);
            Text(600, 541, 130, 22, "T+" + N(duration, "F0") + " s", mono, Muted);
        }
    }
}
