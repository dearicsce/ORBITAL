using System;
using System.Globalization;
using System.Linq;
using UnityEngine;

namespace Orbital
{
    public sealed partial class OrbitalGame
    {
        Flight alternate;
        string alternateRevision;
        string alternateChoice;
        int scrub;
        double playbackClock;
        bool playing;
        Vector2 replayScroll;

        void UpdateReplay()
        {
            if (page != Page.Replay) { playing = false; return; }
            if (!playing || showHelp || !Application.isFocused) return;
            var samples = flight.State.samples;
            playbackClock += Math.Min(Time.unscaledDeltaTime, .1f) * 120;
            while (scrub + 1 < samples.Count && samples[scrub + 1].time <= playbackClock) scrub++;
            if (scrub + 1 == samples.Count) playing = false;
        }

        void Seek(int index)
        {
            scrub = index;
            playbackClock = flight.State.samples[index].time;
        }

        void SeekEvent(bool forward)
        {
            var state = flight.State;
            double now = state.samples[scrub].time;
            double target = forward ? double.PositiveInfinity : double.NegativeInfinity;
            foreach (string entry in state.events)
            {
                int end = entry.IndexOf(" s |", StringComparison.Ordinal);
                if (end <= 2 || !entry.StartsWith("T+", StringComparison.Ordinal) ||
                    !double.TryParse(entry.Substring(2, end - 2), NumberStyles.Float, CultureInfo.InvariantCulture, out double time))
                    continue;
                if (forward && time > now + .005) target = Math.Min(target, time);
                if (!forward && time < now - .005) target = Math.Max(target, time);
            }
            if (!double.IsFinite(target)) return;
            int index = state.samples.FindIndex(s => s.time >= target - .005);
            if (index >= 0) Seek(index);
        }

        void DrawReplay()
        {
            FlightState recorded = flight.State;
            string replayId = !string.IsNullOrEmpty(recorded.runId) ? recorded.runId
                : recorded.snapshot.revision + "/" + recorded.events.Count + "/" + flight.Clock;
            if (alternateRevision != replayId)
            {
                alternateRevision = replayId;
                alternate = null;
                playing = false;
                Seek(0);
            }
            Text(34, 148, 1170, 38, "RECORDED FLIGHT", heading, Ink);
            Card(new Rect(34, 193, 686, 416), "RUN " + (string.IsNullOrEmpty(recorded.runId) ? "LEGACY CHECKPOINT" : recorded.runId));
            Card(new Rect(736, 193, 510, 416), "WHAT-IF SIMULATION");
            int last = recorded.samples.Count - 1;
            scrub = Math.Clamp(scrub, 0, last);
            Sample sample = recorded.samples[scrub];
            Metric(53, 242, 213, "MISSION CLOCK", "T+" + N(sample.time, "F1") + " s");
            Metric(272, 242, 190, "ALTITUDE", N(sample.altitude / 1000) + " km");
            Metric(478, 242, 223, "RESERVE AT SAMPLE", N(sample.charge) + " Wh");
            int selected = (int)Math.Round(GUI.HorizontalSlider(new Rect(53, 300, 649, 22), scrub, 0, Math.Max(1, last)));
            if (last > 0 && selected != scrub) Seek(selected);
            if (Button(new Rect(53, 326, 154, 30), "rewind-prev", "Previous event", false, scrub > 0)) SeekEvent(false);
            if (Button(new Rect(214, 326, 154, 30), "replay-play", playing ? "Pause replay" : "Play at 120×", playing, last > 0))
            {
                if (!playing && scrub == last) Seek(0);
                playing = !playing;
            }
            if (Button(new Rect(375, 326, 154, 30), "rewind-next", "Next event", false, scrub < last)) SeekEvent(true);
            Text(53, 364, 650, 23, $"REV {recorded.snapshot.revision.Substring(0, 12)}  /  {N(sample.received)} MB CONFIRMED  /  {(flight.Success ? "COMPLETE" : "OBJECTIVE MISSED")}", mono, Mint);
            Box(new Rect(53, 386, 648, 1), Border);
            Text(53, 397, 642, 23, "RECORDED EVENTS", mono, Muted);
            replayScroll = GUI.BeginScrollView(new Rect(53, 431, 649, 160), replayScroll,
                new Rect(0, 0, 622, Math.Max(160, recorded.events.Count * 31)));
            for (int i = 0; i < recorded.events.Count; i++) Text(0, i * 31, 622, 31, recorded.events[i], small, Ink);
            GUI.EndScrollView();
            Text(755, 237, 470, 76, "Replay the same snapshot and command history with one imager choice changed. Results are simulated under comparable conditions.", body, Ink);
            bool applicable = recorded.operations != null;
            if (Button(new Rect(755, 314, 471, 36), "alternate-add", "Request imager off at deployment", false,
                applicable && !recorded.commands.Any(c => c.subsystem == Subsystem.Imager && !c.enabled && c.requested == recorded.ascent.seconds)))
                Compare(false);
            if (Button(new Rect(755, 361, 471, 36), "alternate-remove", "Skip the first imager request", false,
                applicable && recorded.commands.Any(c => c.subsystem == Subsystem.Imager)))
                Compare(true);
            if (!applicable) Text(755, 415, 470, 56, "This run ended before orbital operations. There is no imager policy to vary.", small, Muted);
            if (alternate != null)
            {
                var baseline = recorded.operations;
                var branch = alternate.State.operations;
                Text(755, 415, 470, 32, alternateChoice, small, Mint);
                Text(755, 452, 470, 130,
                    $"Battery minimum   {N(baseline.minimum, "F2")} → {N(branch.minimum, "F2")} Wh\nConfirmed delivery   {N(baseline.received)} → {N(branch.received)} MB\nPriority science   {N(baseline.targetReceived)} → {N(branch.targetReceived)} MB",
                    body, Ink);
            }
            if (Button(new Rect(1046, 624, 200, 37), "replay-back", "Return to debrief", true)) Go(Page.Evidence);
        }

        void Compare(bool skip)
        {
            alternate = Replay.Alternate(flight, skip);
            alternateChoice = skip ? "ALTERNATE / FIRST IMAGER REQUEST OMITTED" : "ALTERNATE / IMAGER OFF REQUEST ADDED";
        }

    }
}
