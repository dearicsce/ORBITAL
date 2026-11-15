using System;
using System.Linq;
using Orbital;
using UnityEditor;
using UnityEngine;

public static class EngineeringVerification
{
    [MenuItem("ORBITAL/Verify Engineering")]
    public static void Run()
    {
        var stock = new Review(new Blueprint());
        var improved = new Review(new Blueprint { battery = 1, upperTank = 1 });
        foreach (Check row in improved.Checks)
            Debug.Log($"REVIEW {row.Name}: {row.Status}, {row.Value:R} {row.Units} (margin {row.Margin:R})");
        Require(!stock.CanLaunch && stock.Checks.Single(x => x.Name == "Battery reserve").Status == Verdict.Blocker, "Compact battery should fail reserve");
        Require(improved.CanLaunch, "Extended battery with the U30 tank should pass review");
        var countdown = new Flight(improved, FlightSnapshot.Freeze(improved), startOnPad: true);
        countdown.TickPrelaunch(1);
        var onPad = new Flight(Persistence.DecodeFlight(JsonUtility.ToJson(countdown.State)));
        Require(onPad.Clock == 0 && onPad.State.operations == null && onPad.State.prelaunchRemaining == 3,
            "Countdown checkpoint must preserve pad phase without creating operations.");
        onPad.TickPrelaunch(3);
        Require(onPad.Clock == 0 && onPad.State.ascent.spent == 0, "Release must start with the reviewed liftoff state.");
        for (int i = 0; i < 60; i++) onPad.Advance();
        var inAscent = new Flight(Persistence.DecodeFlight(JsonUtility.ToJson(onPad.State)));
        Require(inAscent.Clock == 15 && inAscent.State.operations == null, "Ascent checkpoint must resume in ascent.");
        while (inAscent.State.operations == null && !inAscent.State.finished) inAscent.Advance();
        Require(inAscent.Clock == improved.Insertion.seconds, "Resumed countdown and ascent must preserve insertion time.");
        var flight = new Flight(improved, FlightSnapshot.Freeze(improved));
        while (flight.State.operations == null || flight.State.operations.elapsed < 1400) flight.Advance();
        var restored = new Flight(JsonUtility.FromJson<FlightState>(JsonUtility.ToJson(flight.State)));
        Require(restored.Clock == flight.Clock && restored.State.operations.r.x == flight.State.operations.r.x, "Round trip must preserve clock and orbital state");
        while (!flight.State.finished) { flight.Advance(); restored.Advance(); }
        Require(flight.Success && restored.Success, "Both live and resumed flights should meet objectives");
        Require(flight.State.operations.received == restored.State.operations.received, "Receipts diverged after reload");
        Require(flight.State.operations.minimum == restored.State.operations.minimum, "Reserve diverged after reload");
        var delayed = new Flight(improved, FlightSnapshot.Freeze(improved));
        while (delayed.State.operations == null) delayed.Advance();
        delayed.Queue(Orbital.Subsystem.Imager, false);
        Require(delayed.State.operations.science && delayed.State.commands[0].status == CommandStatus.Queued, "Queue must preserve the live setting");
        while (!delayed.State.finished) delayed.Advance();
        FlightCommand command = delayed.State.commands[0];
        Require(command.status == CommandStatus.Confirmed && command.sent < command.received && command.received <= command.executed
            && command.executed < command.confirmed && !delayed.State.operations.science, "Command timeline or state is inconsistent");
        Flight alternate = Replay.Alternate(delayed, true);
        Require(alternate.Success && alternate.State.operations.received == flight.State.operations.received, "Replaying with the sole command omitted should match nominal flight");
        var trials = Robustness.Evaluate(improved);
        Require(trials.Count == 9 && trials[0].reserve < trials[4].reserve && trials[4].reserve < trials[8].reserve,
            "Nine-trial battery sensitivity should increase with capacity");
        var profile = new Profile();
        Require(Persistence.ApplyReward(profile, flight) && profile.coins == 100, "First flight reward missing");
        profile = JsonUtility.FromJson<Profile>(JsonUtility.ToJson(profile));
        Require(!Persistence.ApplyReward(profile, restored) && profile.coins == 100, "Reload duplicated a reward");
        const string legacy = @"{""schemaVersion"":1,""format"":""orbital-browser-transfer"",""completed"":[{""id"":""m1"",""stars"":4},{""id"":""unsupported"",""stars"":3}],""coins"":125,""unlocks"":[""battery_m""],""spacecraft"":[{""id"":""sat1""}],""launchers"":[]}";
        var atlas = JsonUtility.FromJson<CampaignIndex>(Resources.Load<TextAsset>("browser-campaign-v2").text);
        var imported = BrowserMigration.Prepare(new Profile(), atlas, legacy);
        var repeated = BrowserMigration.Prepare(imported, atlas, legacy);
        Require(atlas.records.Length == 28 && repeated.browserCompleted.SequenceEqual(new[] { "m1" }), "Campaign index or completion migration incorrect");
        Require(repeated.browserUnlocks.SequenceEqual(new[] { "battery_m" }) && repeated.browserWallet == 125, "Repeated import duplicated wallet or unlock");
        Require(!Persistence.ApplyReward(repeated, restored), "Imported completion earned a duplicate reward");
        Require(repeated.importNote.Contains("unsupported") && repeated.importNote.Contains("0/1 spacecraft"), "Unsupported records need a visible import summary");
        const string rocket = @"{""id"":""courier-test"",""name"":""Courier"",""version"":1,""staging"":[""ignition"",""core-separation"",""fairing-release"",""upper-cutoff"",""payload-release""],""parts"":{""coreTank"":""core-18"",""coreEngine"":""core-k1"",""upperTank"":""upper-18"",""upperEngine"":""upper-k1"",""separator"":""sep-18"",""adapter"":""adapter-18"",""fairing"":""fairing-18"",""guidance"":""guidance-1"",""boosters"":null}}";
        string newer = legacy.Replace(@"""coins"":125", @"""exportedAt"":""2026-11-07T09:00:00Z"",""coins"":92").Replace(@"""launchers"":[]", @"""launchers"":[" + rocket + "]");
        var converted = BrowserMigration.Prepare(repeated, atlas, newer);
        var repeatedNewer = BrowserMigration.Prepare(BrowserMigration.Prepare(converted, atlas, legacy), atlas, newer);
        Require(repeatedNewer.browserWallet == 92 && repeatedNewer.rockets.Count == 1 && repeatedNewer.rockets[0].name.Contains("adapted"),
            "Newer wallet and compatible launcher should import without replay duplication.");
        string dossier = Persistence.Report(improved, restored);
        Require(dossier.Contains(improved.Revision) && dossier.Contains(Orbital.Physics.RocketSource) && dossier.Contains("Flight evidence"), "Evidence missing from report");
        Debug.Log($"ORBITAL verification passed. Restored minimum {restored.State.operations.minimum:F6} Wh, confirmed {restored.State.operations.received:F6} MB.");
    }

    static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
}
