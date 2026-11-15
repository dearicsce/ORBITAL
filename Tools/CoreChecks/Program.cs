using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Orbital;
using static Orbital.Physics;

void Require(bool predicate, string message)
{
    if (!predicate) throw new Exception(message);
}
void Near(double actual, double expected, double tolerance, string name) =>
    Require(Math.Abs(actual - expected) <= tolerance, $"{name}: {actual:R} vs {expected:R} within {tolerance:R}");

using (var stream = new MemoryStream())
{
    string[] frames = { "{\"type\":\"reset\"}", "{\"name\":\"Lunar Δ\"}" };
    foreach (string frame in frames) PresentationFrames.Write(stream, frame, PresentationFrames.Size(frame));
    stream.Position = 0;
    foreach (string frame in frames)
    {
        int size = PresentationFrames.ReadLength(stream, PresentationFrames.MaxFrame);
        Require(PresentationFrames.ReadBody(stream, size) == frame, "UTF-8 frames preserve ordering and payload");
    }
    Require(PresentationFrames.ReadLength(stream, PresentationFrames.MaxFrame) == 0, "Clean pipe EOF");
}
using (var invalid = new MemoryStream(BitConverter.GetBytes(PresentationFrames.MaxFrame + 1)))
{
    try { PresentationFrames.ReadLength(invalid, PresentationFrames.MaxFrame); throw new Exception("Oversize header accepted"); }
    catch (IOException) { }
}
using (var truncated = new MemoryStream(new byte[] { 2, 0, 0, 0, 123 }))
{
    int size = PresentationFrames.ReadLength(truncated, PresentationFrames.MaxFrame);
    try { PresentationFrames.ReadBody(truncated, size); throw new Exception("Truncated frame accepted"); }
    catch (EndOfStreamException) { }
}
Console.WriteLine("PASS: ordered UTF-8 presentation frames, oversized headers and truncated payloads.");

var starter = new Review(new Blueprint());
var improved = new Review(new Blueprint { battery = 1 });
if (args.Length == 2 && args[0] == "--ascent-baseline")
{
    var baseline = new[]
    {
        improved,
        new Review(new Blueprint { battery = 1, upperTank = 1 }),
        new Review(new Blueprint { battery = 1, boosters = 1 })
    }.Select(model =>
    {
        var vehicle = model.Vehicle;
        Ascent ascent = Ascent.Start(vehicle);
        object Sample(string phase) => new
        {
            phase, ascent.seconds, altitudeM = ascent.Height, speedMps = ascent.v.Length,
            radialMps = Vec.Dot(ascent.v, ascent.r.Unit), massKg = ascent.mass,
            activeStageFuelKg = ascent.stageFuel, boosterFuelKg = ascent.boosterFuel,
            spentKg = ascent.spent, jettisonedKg = ascent.jettisoned
        };
        var events = new List<object> { Sample("ground") };
        while (ascent.stage < 2 && !ascent.failed)
        {
            int previous = ascent.stage;
            bool fairingGone = ascent.fairingGone;
            bool boosterGone = ascent.boosterGone;
            ascent.Advance(vehicle);
            if (ascent.boosterGone && !boosterGone) events.Add(Sample(Vehicle.BoosterId + " separation"));
            if (ascent.stage != previous) events.Add(Sample(ascent.stage == 1 ? "lower separation" : "insertion"));
            if (ascent.fairingGone && !fairingGone) events.Add(Sample("fairing release"));
            if (ascent.failed) events.Add(Sample(ascent.failure));
        }
        var elements = Elements(ascent.r, ascent.v);
        return new
        {
            model.Revision, design = model.Design, model.CanLaunch, vehicle.TWR, vehicle.LowerFuel,
            vehicle.LowerThrust, vehicle.UpperFuel, vehicle.UpperThrust, events, ascent.failed,
            periapsisM = elements.periapsis, apoapsisM = elements.apoapsis
        };
    });
    var options = new JsonSerializerOptions { IncludeFields = true, WriteIndented = true };
    File.WriteAllText(args[1], JsonSerializer.Serialize(new { model = Review.Version, stepSeconds = Step, baseline }, options));
    return;
}
foreach (var row in improved.Checks)
    Console.WriteLine($"{row.Name}: {row.Status}, {row.Value:R} {row.Units}");
Console.WriteLine($"Forecast: delivery {improved.Forecast?.PredictedDelivery:R} MB, reserve {improved.Forecast?.SimulatedMinimum:R} Wh");
Require(!starter.CanLaunch && starter.Checks.Count(x => x.Status == Verdict.Blocker) == 1, "Only battery reserve should block the starter");
Require(improved.CanLaunch, "Extended battery should authorize a nominal stack");
var open = new Review(new Blueprint { battery = 1, batteryOpen = true });
Require(open.Vehicle.Battery == 0 && !open.CanLaunch, "Opening the battery path must block launch");
foreach (var invalid in new[] { new Blueprint { feedOpen = true }, new Blueprint { upperTank = 2 },
    new Blueprint { engineOffset = true }, new Blueprint { payloadFirst = true }, new Blueprint { upperFirst = true }, new Blueprint { fairing = 1 } })
{
    invalid.battery = 1;
    Require(!new Review(invalid).CanLaunch, "Invalid hardware must block launch");
}
var upgrade = new Review(new Blueprint { battery = 1, upperTank = 1 });
Require(upgrade.Vehicle.Wet > improved.Vehicle.Wet && upgrade.Vehicle.TWR < improved.Vehicle.TWR &&
    upgrade.Vehicle.UpperDeltaV > improved.Vehicle.UpperDeltaV, "Tank replacement must recalculate mass, TWR, and delta-v");
Console.WriteLine("Tank upgrade launch gate: " + upgrade.CanLaunch);
void Reject(FlightSnapshot authorization)
{
    try { _ = new Flight(improved, authorization); }
    catch (InvalidOperationException) { return; }
    throw new Exception("Accepted stale/forged review");
}
Reject(FlightSnapshot.Freeze(upgrade));
var forged = FlightSnapshot.Freeze(improved);
forged.blueprint.upperTank = 1;
Reject(forged);

double r0 = Radius + 270000;
var r = new Vec(r0, 0);
var v = new Vec(0, Math.Sqrt(Mu / r0));
double t = 2 * Math.PI * Math.Sqrt(r0 * r0 * r0 / Mu);
for (int i = 0; i < 20000; i++)
{
    Propagate(ref r, ref v, t / 20000);
    Near(Energy(r, v), -Mu / (2 * r0), .02, "Circular specific energy");
    Near(Vec.Cross(r, v), Math.Sqrt(Mu * r0), .01, "Specific angular momentum");
}
Near((r - new Vec(r0, 0)).Length, 0, 3, "Closed circular orbit");
Near(DeltaV(2, 1, 300), 2039.235, .03, "Known ideal impulse");
Require(Link(new Vec(r0, 0), 0).visible && Link(new Vec(-r0, 0), 0).occulted, "Station horizon geometry");
Near(Link(new Vec(r0, 0), 0).delay, 270000.0 / 299792458, 1e-12, "Overhead light time");

var reference = Ascent.Predict(improved.Vehicle, Step / 4);
Near((reference.r - improved.Insertion.r).Length, 0, 4500, "Ascent spatial refinement");
Near((reference.v - improved.Insertion.v).Length, 0, 55, "Ascent velocity refinement");
var held = new Flight(improved, FlightSnapshot.Freeze(improved), startOnPad: true);
held.Advance();
held.TickPrelaunch(Flight.CountdownSeconds);
Require(held.State.prelaunchRemaining == Flight.IgnitionHoldSeconds && held.Clock == 0
    && held.State.ascent.Height == 0 && held.State.ascent.spent == 0, "Countdown must hold the initial ascent state");
held.TickPrelaunch(Flight.IgnitionHoldSeconds);
Require(held.State.prelaunchRemaining == 0 && held.Clock == 0, "Release must occur at T+0");
while (held.State.operations == null && !held.State.finished) held.Advance();
Near(held.Clock, 353.3436428571449, Step, "Nominal insertion with countdown");
var boosted = new Review(new Blueprint { battery = 1, boosters = 1 });
var boosterFlight = new Flight(boosted, FlightSnapshot.Freeze(boosted));
while (boosterFlight.State.operations == null && !boosterFlight.State.finished)
{
    boosterFlight.Advance();
    var a = boosterFlight.State.ascent;
    Near(a.mass + a.spent + a.jettisoned, boosted.Vehicle.Wet, 1e-7, "Boosted mass conservation");
}
var boosterEvents = boosterFlight.State.events;
int boosterEvent = boosterEvents.FindIndex(e => e.Contains(Vehicle.BoosterId));
Require(boosterEvent >= 0 && boosterEvents.Count(e => e.Contains(Vehicle.BoosterId)) == 1
    && boosterEvents[boosterEvent + 1].Contains("Lower assembly"), "Booster burnout and separation must precede core staging");
Require(boosterFlight.State.ascent.boosterFuel == 0 && boosterFlight.State.operations != null, "Booster fuel must be exhausted before deployment");
Near(boosterFlight.Clock, 352.5936428571439, Step, "Boosted insertion time");
var flight = new Flight(improved, FlightSnapshot.Freeze(improved));
var state = flight.State;
Near(state.ascent.pitch, 90, 0, "Ignition attitude must start vertical");
while (state.operations == null && !state.finished) flight.Advance();
Require(state.operations != null, "Reached orbit");
Near((state.operations.r - state.ascent.r).Length, 0, 0, "Continuous insertion position");
Near((state.operations.v - state.ascent.v).Length, 0, 0, "Continuous insertion velocity");
Near(state.ascent.mass + state.ascent.spent + state.ascent.jettisoned, improved.Vehicle.Wet, 1e-7, "Mass conservation");
bool sawPacket = false;
while (!state.finished)
{
    flight.Advance();
    var o = state.operations;
    double inFlight = o.inFlight.Sum(p => p.size);
    sawPacket |= inFlight > 0;
    Near(o.received + inFlight, o.sent, 1e-8, "Packet accounting");
    Near(o.collected, o.stored + o.sent + o.lost, 1e-8, "Science data accounting");
    Near(o.targetCollected, o.targetStored + o.targetSent + o.targetLost, 1e-8, "Priority data accounting");
    Near(o.targetSent, o.targetReceived + o.inFlight.Sum(p => p.target), 1e-8, "Priority receipt accounting");
    Near(improved.Vehicle.Battery + o.generated, o.charge + o.supplied + o.spilled, 1e-8, "Battery energy accounting");
}
Require(sawPacket && flight.Success, "Confirmed science delivery and reserve");
Near(state.operations.minimum, improved.Forecast.SimulatedMinimum, 1e-9, "Forecast vs nominal telemetry");
Near(state.operations.received, improved.Forecast.PredictedDelivery, 1e-9, "Forecast vs nominal receipts");
Console.WriteLine($"PASS: nominal flight delivered {state.operations.received:F3} MB; minimum {state.operations.minimum:F3} Wh.");

// A matching blueprint hash is not enough to trust a checkpoint's live state.
void RejectState(string label)
{
    try { _ = new Flight(state); }
    catch (InvalidOperationException) { return; }
    throw new Exception("Accepted corrupt checkpoint: " + label);
}
_ = new Flight(state);
var goodCharge = state.operations.charge;
state.operations.charge = double.NaN;
RejectState("nonfinite battery");
state.operations.charge = goodCharge;
var goodPackets = state.operations.inFlight;
state.operations.inFlight = null;
RejectState("missing packet collection");
state.operations.inFlight = goodPackets;
var goodSamples = state.samples;
state.samples = new System.Collections.Generic.List<Sample>();
RejectState("empty replay telemetry");
state.samples = goodSamples;
state.ascent.mass += 10;
RejectState("mass conservation broken");
state.ascent.mass -= 10;
_ = new Flight(state);
Console.WriteLine("PASS: corrupt checkpoints rejected; valid completed checkpoint accepted.");

int reviewed = 0, authorized = 0;
for (int battery = 0; battery < 3; battery++)
for (int array = 0; array < 2; array++)
for (int lower = 0; lower < 2; lower++)
for (int upper = 0; upper < 2; upper++)
for (int engine = 0; engine < 2; engine++)
for (int boosters = 0; boosters < 2; boosters++)
for (int phase = 0; phase < 3; phase++)
{
    var candidate = new Review(new Blueprint { battery = battery, array = array, lowerTank = lower,
        upperTank = upper, engine = engine, boosters = boosters, launchPhase = phase });
    reviewed++;
    if (!candidate.CanLaunch) continue;
    authorized++;
    Require(candidate.Forecast.SimulatedMinimum >= Vehicle.Reserve
        && candidate.Forecast.PredictedDelivery >= Vehicle.DownlinkTarget
        && candidate.Forecast.TargetDelivered >= Observation.TargetDelivery,
        "Launch review authorizes a nominal mission that misses its objective: " + candidate.Design.Key);
}
Console.WriteLine($"PASS: {reviewed} catalogue/lighting configurations checked; {authorized} authorized forecasts meet mission targets.");

