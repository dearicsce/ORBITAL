using System;
using System.Collections.Generic;

namespace Orbital
{
    public sealed class Forecast
    {
        public double LongestDark, ContactSeconds, WindowSeconds, PredictedDelivery, SimulatedMinimum, TargetDelivered, Footprint, Sampling, Revisit;
        public static Forecast Calculate(Vehicle vehicle, Ascent insertion)
        {
            var state = Operations.Start(vehicle, insertion);
            double window = Math.Ceiling(Physics.Elements(insertion.r, insertion.v).period * 1.45);
            while (state.elapsed < window) state.Advance(vehicle, insertion.seconds);
            return new Forecast
            {
                LongestDark = state.longestDark, ContactSeconds = state.contactSeconds, WindowSeconds = window,
                PredictedDelivery = state.received, SimulatedMinimum = state.minimum, TargetDelivered = state.targetReceived,
                Footprint = state.firstFootprint, Sampling = state.firstSampling, Revisit = state.revisit
            };
        }
    }

    [Serializable]
    public sealed class Packet
    {
        public double due, size, target;
    }

    [Serializable]
    public sealed class Operations
    {
        public Vec r, v;
        public double elapsed, charge, minimum, longestDark, currentDark, contactSeconds;
        public double collected, stored, sent, received, lost, unserved, generated, spilled, supplied;
        public double targetCollected, targetStored, targetSent, targetReceived, targetLost;
        public double firstObservation, firstTargetReceipt, firstFootprint, firstSampling, revisit;
        public bool targetVisible;
        public bool science = true, radio = true, batteryGuard, safeMode;
        public List<Packet> inFlight = new List<Packet>();

        public static Operations Start(Vehicle vehicle, Ascent insertion) => new Operations
        {
            r = insertion.r, v = insertion.v, charge = vehicle.Battery, minimum = vehicle.Battery
        };

        public void Advance(Vehicle vehicle, double insertionTime)
        {
            double startTime = insertionTime + elapsed;
            Vec startR = r, startV = v;
            Physics.Propagate(ref r, ref v, Physics.OrbitStep);
            elapsed += Physics.OrbitStep;

            // Resolve the resource intervals at geometric transitions within the one-second orbital step.
            double darkBoundary = Boundary(startR, startV, startTime, vehicle.Sun, false);
            double linkBoundary = Boundary(startR, startV, startTime, vehicle.Sun, true);
            double first = Math.Min(darkBoundary, linkBoundary);
            double last = Math.Max(darkBoundary, linkBoundary);
            Integrate(vehicle, startR, startV, startTime, 0, first);
            Integrate(vehicle, startR, startV, startTime, first, last);
            Integrate(vehicle, startR, startV, startTime, last, Physics.OrbitStep);
            for (int i = inFlight.Count - 1; i >= 0; i--)
            {
                if (inFlight[i].due > insertionTime + elapsed) continue;
                received += inFlight[i].size;
                targetReceived += inFlight[i].target;
                if (inFlight[i].target > 0 && firstTargetReceipt == 0) firstTargetReceipt = inFlight[i].due;
                inFlight.RemoveAt(i);
            }
        }

        double Boundary(Vec startR, Vec startV, double startTime, Vec sun, bool link)
        {
            bool Active(Vec point, double offset) => link
                ? Physics.Link(point, startTime + offset).visible : Physics.Shadow(point, sun);
            bool start = Active(startR, 0);
            if (start == Active(r, Physics.OrbitStep)) return Physics.OrbitStep;
            double low = 0, high = Physics.OrbitStep;
            for (int i = 0; i < 14; i++)
            {
                double middle = (low + high) / 2;
                Vec point = startR, velocity = startV;
                Physics.Propagate(ref point, ref velocity, middle);
                if (Active(point, middle) == start) low = middle;
                else high = middle;
            }
            return (low + high) / 2;
        }

        void Integrate(Vehicle vehicle, Vec startR, Vec startV, double startTime, double start, double end)
        {
            if (end <= start) return;
            double midpoint = (start + end) / 2, dt = end - start;
            Physics.Propagate(ref startR, ref startV, midpoint);
            bool dark = Physics.Shadow(startR, vehicle.Sun);
            var link = Physics.Link(startR, startTime + midpoint);
            if (dark)
            {
                currentDark += dt;
                longestDark = Math.Max(longestDark, currentDark);
            }
            else currentDark = 0;
            if (link.visible) contactSeconds += dt;

            bool observing = !dark && science && !safeMode && vehicle.HasImager;
            bool transmitting = !dark && radio && link.visible && vehicle.AntennaConnected;
            double load = (vehicle.DarkLoad + (observing ? vehicle.ScienceLoad : 0) + (transmitting ? 25 : 0)) * dt / 3600;
            double produced = (dark ? 0 : vehicle.Solar) * dt / 3600;
            double available = charge + produced;
            double consumed = Math.Min(load, available);
            double residual = available - consumed;
            charge = Math.Min(vehicle.Battery, residual);
            generated += produced;
            supplied += consumed;
            spilled += residual - charge;
            unserved += load - consumed;
            minimum = Math.Min(minimum, charge);

            double poweredSeconds = dt * consumed / load;
            var target = Observation.Geometry(startR, startTime + midpoint, vehicle.Sun);
            if (target.accessible && !targetVisible && firstObservation != 0 && revisit == 0)
                revisit = startTime + midpoint - firstObservation;
            targetVisible = target.accessible;
            if (observing)
            {
                double amount = poweredSeconds * Vehicle.ScienceRate;
                double reclaimed = target.accessible ? Math.Min(Math.Max(0, amount - (vehicle.Storage - stored)), stored - targetStored) : 0;
                stored -= reclaimed;
                lost += reclaimed;
                double accepted = Math.Min(vehicle.Storage - stored, amount);
                collected += amount;
                stored += accepted;
                lost += amount - accepted;
                if (target.accessible && amount > 0)
                {
                    if (firstObservation == 0)
                    {
                        firstObservation = startTime + midpoint;
                        firstFootprint = target.width;
                        firstSampling = target.sampling;
                    }
                    targetCollected += amount;
                    targetStored += accepted;
                    targetLost += amount - accepted;
                }
            }
            if (transmitting && stored > 0 && poweredSeconds > 0)
            {
                double amount = Math.Min(stored, poweredSeconds * vehicle.RadioRate);
                double priority = Math.Min(amount, targetStored);
                stored -= amount;
                targetStored -= priority;
                sent += amount;
                targetSent += priority;
                inFlight.Add(new Packet { due = startTime + end + link.delay, size = amount, target = priority });
            }
        }
    }

    [Serializable]
    public sealed class FlightSnapshot
    {
        public string version, revision, mission;
        public Blueprint blueprint;
        public FlightExpectations expectations;
        public bool Matches(Review review) => blueprint != null && blueprint.Valid
            && version == Review.Version && mission == Review.Mission && revision == review.Revision
            && Review.Identify(blueprint) == revision;
        public static FlightSnapshot Freeze(Review review) => new FlightSnapshot
        {
            blueprint = review.Design, version = Review.Version, mission = Review.Mission, revision = review.Revision,
            expectations = review.Forecast != null ? FlightExpectations.Freeze(review) : null
        };
    }

    [Serializable]
    public sealed class Sample
    {
        public double time, altitude, speed, charge, received, stored, sent, mass, x, y, vx, vy;
    }

    [Serializable]
    public sealed class FlightState
    {
        public FlightSnapshot snapshot;
        public string runId;
        public Ascent ascent;
        public Operations operations;
        public double prelaunchRemaining;
        public bool finished;
        public int seed;
        public List<FlightCommand> commands = new List<FlightCommand>();
        public List<Sample> samples = new List<Sample>();
        public List<string> events = new List<string>();
    }

    public sealed class Flight
    {
        public const double CountdownSeconds = 3;
        public const double IgnitionHoldSeconds = 1;
        public readonly Review Review;
        public readonly FlightState State;
        public double Clock => State.ascent.seconds + (State.operations?.elapsed ?? 0);
        public bool Success => State.finished && State.operations != null
            && State.operations.minimum >= Vehicle.Reserve && State.operations.received >= Vehicle.DownlinkTarget
            && State.operations.unserved < 1e-6 && State.operations.targetReceived >= Observation.TargetDelivery;

        public Flight(Review current, FlightSnapshot authorization, bool startOnPad = false)
        {
            var recalculated = new Review(current.Design);
            if (!recalculated.CanLaunch || authorization == null || !authorization.Matches(recalculated))
                throw new InvalidOperationException("Launch requires a passing review of this exact blueprint.");
            Review = recalculated;
            State = new FlightState
            {
                runId = Guid.NewGuid().ToString("N"), snapshot = FlightSnapshot.Freeze(recalculated), ascent = Ascent.Start(Review.Vehicle)
            };
            State.prelaunchRemaining = startOnPad ? CountdownSeconds + IgnitionHoldSeconds : 0;
            Record(startOnPad ? "Vehicle held on the launch pad" : "Ignition");
        }

        public Flight(FlightState state)
        {
            if (state?.snapshot?.blueprint == null || state.ascent == null || state.samples == null || state.events == null || state.commands == null
                || (!string.IsNullOrEmpty(state.runId) && !Guid.TryParseExact(state.runId, "N", out _)))
                throw new InvalidOperationException("Incomplete checkpoint.");
            Review = new Review(state.snapshot.blueprint);
            if (!Review.CanLaunch || !state.snapshot.Matches(Review)
                || (state.operations != null && state.ascent.stage != 2))
                throw new InvalidOperationException("Checkpoint does not match a supported reviewed flight.");
            ValidateState(state, Review.Vehicle);
            State = state;
        }

        static void ValidateState(FlightState state, Vehicle vehicle)
        {
            bool Nonnegative(double x) => double.IsFinite(x) && x >= -1e-7;
            bool Vector(Vec x) => double.IsFinite(x.x) && double.IsFinite(x.y);
            var a = state.ascent;
            if (!Vector(a.r) || !Vector(a.v) || a.r.Length < Physics.Radius - 100
                || !Nonnegative(a.seconds) || !Nonnegative(a.mass) || a.mass <= 0
                || !Nonnegative(a.stageFuel) || !Nonnegative(a.spent) || !Nonnegative(a.jettisoned)
                || !Nonnegative(a.boosterFuel) || a.boosterFuel > vehicle.BoosterFuel || a.boosterFuel > a.stageFuel + 1e-7
                || !Nonnegative(a.boosterTime) || a.boosterTime > a.seconds
                || !Nonnegative(a.fairingTime) || a.fairingTime > a.seconds
                || !double.IsFinite(a.pitch) || !Nonnegative(a.stageTime) || a.stageTime > a.seconds
                || a.stage < 0 || a.stage > 2 || (a.failed && !state.finished)
                || (a.stage == 2 && state.operations == null)
                || Math.Abs(a.mass + a.spent + a.jettisoned - vehicle.Wet) > .001
                || state.samples.Count == 0
                || !Nonnegative(state.prelaunchRemaining)
                || state.prelaunchRemaining > CountdownSeconds + IgnitionHoldSeconds
                || (state.prelaunchRemaining > 0 && (a.seconds != 0 || a.stage != 0 || state.finished)))
                throw new InvalidOperationException("Checkpoint has invalid ascent state.");
            var o = state.operations;
            if (o != null)
            {
                if (!Vector(o.r) || !Vector(o.v) || o.r.Length < Physics.Radius
                    || !Nonnegative(o.elapsed) || !Nonnegative(o.charge) || o.charge > vehicle.Battery + 1e-6
                    || !Nonnegative(o.minimum) || o.minimum > o.charge + 1e-6
                    || !Nonnegative(o.stored) || o.stored > vehicle.Storage + 1e-6
                    || !Nonnegative(o.collected) || !Nonnegative(o.sent) || !Nonnegative(o.received)
                    || !Nonnegative(o.lost) || !Nonnegative(o.unserved) || !Nonnegative(o.generated)
                    || !Nonnegative(o.spilled) || !Nonnegative(o.supplied) || o.inFlight == null
                    || !Nonnegative(o.targetStored) || o.targetStored > o.stored + 1e-6
                    || !Nonnegative(o.targetCollected) || !Nonnegative(o.targetReceived)
                    || !Nonnegative(o.targetSent) || !Nonnegative(o.targetLost))
                    throw new InvalidOperationException("Checkpoint has invalid operations state.");
                foreach (var packet in o.inFlight)
                    if (packet == null || !Nonnegative(packet.due) || !Nonnegative(packet.size)
                        || !Nonnegative(packet.target) || packet.target > packet.size + 1e-6)
                        throw new InvalidOperationException("Checkpoint has invalid packets.");
            }
            double last = -1;
            foreach (var sample in state.samples)
            {
                if (sample == null || !Nonnegative(sample.time) || sample.time < last
                    || sample.time > a.seconds + (o?.elapsed ?? 0) + 1e-6
                    || !double.IsFinite(sample.altitude) || !Nonnegative(sample.charge)
                    || !double.IsFinite(sample.x) || !double.IsFinite(sample.y))
                    throw new InvalidOperationException("Checkpoint has invalid telemetry.");
                last = sample.time;
            }
            foreach (var command in state.commands)
                if (command == null || !Enum.IsDefined(typeof(Subsystem), command.subsystem)
                    || !Enum.IsDefined(typeof(CommandStatus), command.status) || !Nonnegative(command.requested)
                    || !Nonnegative(command.sent) || !Nonnegative(command.received)
                    || !Nonnegative(command.executed) || !Nonnegative(command.confirmed))
                    throw new InvalidOperationException("Checkpoint has invalid commands.");
        }

        public void TickPrelaunch(double realSeconds)
        {
            double before = State.prelaunchRemaining;
            if (before <= 0 || !double.IsFinite(realSeconds) || realSeconds <= 0) return;
            State.prelaunchRemaining = Math.Max(0, before - realSeconds);
            if (before > IgnitionHoldSeconds && State.prelaunchRemaining <= IgnitionHoldSeconds)
                Record("Held ignition preview; propellant flow begins at release");
            if (State.prelaunchRemaining == 0) Record("Released from the launch pad");
        }

        public void Advance()
        {
            if (State.finished || State.prelaunchRemaining > 0) return;
            var a = State.ascent;
            var v = Review.Vehicle;
            if (State.operations == null)
            {
                int previousStage = a.stage;
                bool fairing = a.fairingGone;
                bool booster = a.boosterGone;
                a.Advance(v);
                if (!fairing && a.fairingGone) Record("Fairing separated");
                if (!booster && a.boosterGone) Record("Burnout and separation: " + Vehicle.BoosterId);
                if (previousStage == 0 && a.stage == 1) Record("Lower assembly separated; upper engine ignited");
                if (a.failed) { State.finished = true; Record(a.failure); }
                if (a.stage == 2)
                {
                    State.operations = Operations.Start(v, a);
                    Record("Upper cutoff and payload deployment; position and velocity carried forward");
                }
            }
            else
            {
                var o = State.operations;
                bool shadow = Physics.Shadow(o.r, v.Sun);
                bool contact = Physics.Link(o.r, Clock).visible;
                double before = o.received, beforeTarget = o.targetReceived, observed = o.targetCollected;
                o.Advance(v, a.seconds);
                ProcessCommands(o);
                bool safe = o.batteryGuard && (o.safeMode ? o.charge < 38 : o.charge <= 30);
                if (safe != o.safeMode) { o.safeMode = safe; Record(safe ? "Autonomy suspended imager below 30 Wh" : "Autonomy released imager hold"); }
                if (shadow != Physics.Shadow(o.r, v.Sun)) Record(shadow ? "Eclipse exit" : "Eclipse entry");
                if (contact != Physics.Link(o.r, Clock).visible) Record(contact ? "Ground contact closed" : "Ground contact opened");
                if (observed == 0 && o.targetCollected > 0) Record("First simulated Manaus observation");
                if (beforeTarget < Observation.TargetDelivery && o.targetReceived >= Observation.TargetDelivery) Record("Priority Manaus data confirmed");
                if (before < Vehicle.DownlinkTarget && o.received >= Vehicle.DownlinkTarget) Record("Delivery target confirmed");
                if (o.elapsed >= Review.Forecast.WindowSeconds)
                {
                    State.finished = true;
                    Record("Operating window complete");
                }
            }

            if (State.samples.Count == 0 || Clock - State.samples[State.samples.Count - 1].time >= 30 || State.finished)
                Sample();
        }

        public bool Requested(Subsystem subsystem)
        {
            for (int i = State.commands.Count - 1; i >= 0; i--)
                if (State.commands[i].subsystem == subsystem) return State.commands[i].enabled;
            return subsystem != Subsystem.BatteryGuard;
        }

        public void Queue(Subsystem subsystem, bool enabled)
        {
            if (State.operations == null || State.finished || State.commands.Count >= 100 || Requested(subsystem) == enabled) return;
            var command = new FlightCommand { subsystem = subsystem, enabled = enabled, requested = Clock };
            State.commands.Add(command);
            Record("Queued " + command.Description);
        }

        void ProcessCommands(Operations o)
        {
            var link = Physics.Link(o.r, Clock);
            foreach (FlightCommand command in State.commands)
            {
                switch (command.status)
                {
                    case CommandStatus.Queued when link.visible && Review.Vehicle.AntennaConnected:
                        command.sent = Clock;
                        command.received = Clock + link.delay;
                        command.status = CommandStatus.Uplink;
                        Record("Sent " + command.Description);
                        break;
                    case CommandStatus.Uplink when Clock >= command.received:
                        if (command.subsystem == Subsystem.Imager) o.science = command.enabled;
                        else if (command.subsystem == Subsystem.Downlink) o.radio = command.enabled;
                        else o.batteryGuard = command.enabled;
                        command.executed = Clock;
                        command.status = CommandStatus.Executed;
                        Record(FormattableString.Invariant($"Received {command.Description} at T+{command.received:F3} s; executed"));
                        break;
                    case CommandStatus.Executed when link.visible && Review.Vehicle.AntennaConnected:
                        if (command.confirmed == 0) command.confirmed = Clock + link.delay;
                        if (Clock >= command.confirmed)
                        {
                            command.status = CommandStatus.Confirmed;
                            Record("Confirmed " + command.Description);
                        }
                        break;
                    case CommandStatus.Executed when command.confirmed > 0 && Clock >= command.confirmed:
                        command.status = CommandStatus.Confirmed;
                        Record("Confirmed " + command.Description);
                        break;
                }
            }
        }

        void Record(string value)
        {
            State.events.Add(FormattableString.Invariant($"T+{Clock:F2} s | {value}"));
            Sample();
        }

        void Sample()
        {
            var a = State.ascent;
            var o = State.operations;
            State.samples.Add(new Sample
            {
                time = Clock, altitude = (o?.r.Length ?? a.r.Length) - Physics.Radius,
                speed = o?.v.Length ?? a.v.Length, charge = o?.charge ?? Review.Vehicle.Battery,
                received = o?.received ?? 0, sent = o?.sent ?? 0, stored = o?.stored ?? 0, mass = a.mass,
                x = o?.r.x ?? a.r.x, y = o?.r.y ?? a.r.y, vx = o?.v.x ?? a.v.x, vy = o?.v.y ?? a.v.y
            });
        }
    }
}
