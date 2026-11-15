using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Orbital
{
    [Serializable]
    public sealed class Blueprint
    {
        public int battery, array, lowerTank, upperTank, engine, fairing, boosters, payload, recorder, antenna;
        public bool batteryOpen, arrayOpen, feedOpen, upperFirst, payloadFirst, engineOffset;
        public int launchPhase, stagingOrder;
        public Blueprint Copy() => (Blueprint)MemberwiseClone();
        public string Key => FormattableString.Invariant(
            $"{battery},{array},{lowerTank},{upperTank},{engine},{fairing},{boosters},{payload},{recorder},{antenna},{batteryOpen},{arrayOpen},{feedOpen},{upperFirst},{payloadFirst},{engineOffset},{launchPhase},{stagingOrder}");
        public bool Valid => battery >= 0 && battery <= 2 && array >= 0 && array <= 1
            && lowerTank >= 0 && lowerTank <= 1 && upperTank >= 0 && upperTank <= 2
            && engine >= 0 && engine <= 1 && fairing >= 0 && fairing <= 1 && boosters >= 0 && boosters <= 1
            && payload >= 0 && payload <= 1 && recorder >= 0 && recorder <= 1 && antenna >= 0 && antenna <= 1
            && launchPhase >= 0 && launchPhase <= 2 && stagingOrder >= 0 && stagingOrder < Staging.Sequences.Length;
    }

    public static class Staging
    {
        public static readonly string[][] Sequences =
        {
            new[] { "Lower separation", "Upper ignition", "Payload release" },
            new[] { "Lower separation", "Payload release", "Upper ignition" },
            new[] { "Upper ignition", "Lower separation", "Payload release" },
            new[] { "Upper ignition", "Payload release", "Lower separation" },
            new[] { "Payload release", "Lower separation", "Upper ignition" },
            new[] { "Payload release", "Upper ignition", "Lower separation" }
        };
    }

    public sealed class Vehicle
    {
        public readonly double LowerFuel, LowerDry, UpperFuel, UpperDry, FairingMass, PayloadMass, LowerThrust, UpperThrust;
        public readonly double BoosterFuel, BoosterDry, BoosterThrust;
        public const double CoreThrust = 2450000;
        public const string BoosterId = "strap-on-pair";
        public readonly double Battery, Solar, DarkLoad, ScienceLoad, Storage, RadioRate, Cost, DragArea, PayloadWidth, FairingWidth;
        public readonly bool BatteryConnected, SolarConnected, FeedConnected, CompatibleFuel, StageOrder, HasImager, AntennaConnected;
        public readonly double Offset;
        public readonly Vec Sun;
        public const double Reserve = 22;
        public const double Budget = 100;
        public const double DownlinkTarget = 300;
        public const double ScienceRate = .22;
        public const double LowerIsp = 300;
        public const double UpperIsp = 350;
        public double UpperWet => UpperDry + UpperFuel + PayloadMass;
        public double Wet => UpperWet + LowerDry + LowerFuel + FairingMass;
        public double Dry => LowerDry + UpperDry + FairingMass + PayloadMass;
        public double LowerDeltaV => Physics.DeltaV(Wet, Wet - LowerFuel, LowerIsp);
        public double UpperDeltaV => Physics.DeltaV(UpperWet, UpperWet - UpperFuel, UpperIsp);
        public double TWR => LowerThrust / (Wet * Physics.G0);
        public double Torque => Offset * UpperThrust;

        public Vehicle(Blueprint b) : this(b, 1, 1) { }

        internal Vehicle(Blueprint b, double capacityFactor, double solarFactor)
        {
            double coreFuel = b.lowerTank == 0 ? 115000 : 122000;
            BoosterFuel = b.boosters == 0 ? 0 : 23000;
            BoosterDry = b.boosters == 0 ? 0 : 2400;
            BoosterThrust = CoreThrust * BoosterFuel / coreFuel;
            LowerFuel = coreFuel + BoosterFuel;
            LowerDry = 9800 + (b.lowerTank == 0 ? 0 : 420) + BoosterDry;
            LowerThrust = CoreThrust + BoosterThrust;
            UpperFuel = b.upperTank == 1 ? 30000 : 28000;
            UpperDry = b.upperTank == 1 ? 4030 : 3800;
            UpperThrust = b.engine == 0 ? 420000 : 440000;
            FairingMass = b.fairing == 0 ? 650 : 500;
            FairingWidth = b.fairing == 0 ? 2.8 : 1.85;
            PayloadWidth = b.payload == 0 ? 2.2 : 1.55;
            DragArea = (b.fairing == 0 ? 8 : 7) + (b.boosters == 0 ? 0 : 2);
            PayloadMass = 330 + (b.battery == 0 ? 0 : b.battery == 1 ? 14 : 33)
                + b.array * 18 + b.recorder * 4 + (b.payload == 0 ? 0 : -35);
            BatteryConnected = !b.batteryOpen;
            SolarConnected = !b.arrayOpen;
            Battery = BatteryConnected ? (b.battery == 0 ? 64 : b.battery == 1 ? 145 : 260) * capacityFactor : 0;
            Solar = SolarConnected ? (b.array == 0 ? 270 : 360) * solarFactor : 0;
            DarkLoad = 120;
            ScienceLoad = 40;
            Storage = b.recorder == 0 ? 540 : 180;
            AntennaConnected = b.antenna == 0;
            RadioRate = AntennaConnected ? 2 : 0;
            HasImager = b.payload == 0;
            FeedConnected = !b.feedOpen;
            CompatibleFuel = b.upperTank != 2;
            StageOrder = b.stagingOrder == 0 && !b.upperFirst && !b.payloadFirst;
            Offset = b.engineOffset ? .18 : 0;
            Cost = 64 + b.battery * 8 + b.array * 6 + b.lowerTank * 4 + (b.upperTank == 1 ? 5 : 0)
                + b.boosters * 15 + b.engine * 6 - b.recorder * 3 - b.fairing * 4 - b.payload * 6 - b.antenna * 3;
            Sun = Vec.At((b.launchPhase - 1) * 45 * Physics.Degree);
        }

        public double Centre(double lowerFuel, double upperFuel, bool lowerAttached, bool fairingAttached)
        {
            double fairing = fairingAttached ? FairingMass : 0;
            if (!lowerAttached) return (UpperDry * 4 + upperFuel * 4 + fairing * 10 + PayloadMass * 10)
                / (UpperDry + upperFuel + fairing + PayloadMass);
            return (LowerDry * 9 + lowerFuel * 10 + (UpperDry + upperFuel) * 24 + fairing * 30 + PayloadMass * 30)
                / (LowerDry + lowerFuel + UpperDry + upperFuel + fairing + PayloadMass);
        }
    }

    public enum Verdict { Pass, Warning, Blocker }

    public sealed class Check
    {
        public readonly string Name, Requirement, Units, Inputs, Equation, Source, Assumptions, Range, Component, Fix;
        public readonly double Limit, Value, Margin;
        public readonly Verdict Status;
        public string Version => Review.Version;

        public Check(string name, string requirement, string units, double limit, double value, double margin,
            string inputs, string equation, string source, string assumptions, string range, string component, string fix,
            Verdict? explicitStatus = null)
        {
            Name = name; Requirement = requirement; Units = units; Limit = limit; Value = value; Margin = margin;
            Inputs = inputs; Equation = equation; Source = source; Assumptions = assumptions; Range = range;
            Component = component; Fix = fix;
            Status = explicitStatus ?? (string.IsNullOrEmpty(source) || double.IsNaN(value) || double.IsInfinity(value) || margin < 0
                ? Verdict.Blocker : Verdict.Pass);
        }
    }

    public sealed class Review
    {
        public const string Version = "earth-1.2.0";
        public const string Mission = "m1";
        public const string Catalog = "ORBITAL demonstration catalogue v1 (fictional parts)";
        public const string Policy = "ORBITAL Earth demonstration rules v1 (authored allowances)";
        public readonly Vehicle Vehicle;
        public readonly Ascent Insertion;
        public readonly Forecast Forecast;
        public readonly IReadOnlyList<Check> Checks;
        public readonly string Revision;
        readonly Blueprint design;
        public Blueprint Design => design.Copy();
        public bool CanLaunch
        {
            get
            {
                foreach (Check check in Checks) if (check.Status == Verdict.Blocker) return false;
                return true;
            }
        }

        public static string Identify(Blueprint blueprint)
        {
            using var sha = SHA256.Create();
            byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(Version + "|" + Mission + "|" + blueprint.Key));
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }

        public Review(Blueprint blueprint)
        {
            if (blueprint == null || !blueprint.Valid) throw new ArgumentException("Unsupported blueprint values.");
            design = blueprint.Copy();
            Revision = Identify(design);
            Vehicle v = Vehicle = new Vehicle(design);
            bool stackValid = v.FeedConnected && v.CompatibleFuel && v.StageOrder && v.Offset == 0 && v.FairingWidth >= v.PayloadWidth && v.TWR > 1;
            if (stackValid)
            {
                Insertion = Ascent.Predict(v);
                if (!Insertion.failed && Insertion.stage == 2)
                    Forecast = Forecast.Calculate(v, Insertion);
            }
            double perigee = Forecast != null ? Physics.Elements(Insertion.r, Insertion.v).periapsis / 1000 : double.NaN;
            double eclipseHours = Forecast != null ? Forecast.LongestDark / 3600 : double.NaN;
            double reserve = v.Battery - v.DarkLoad * eclipseHours;
            double contact = Forecast?.ContactSeconds ?? double.NaN;
            string orbitInputs = Insertion == null ? "Blocked by stack constraints" : Insertion.failed ? Insertion.failure
                : FormattableString.Invariant($"r=({Insertion.r.x:R}, {Insertion.r.y:R}) m; v=({Insertion.v.x:R}, {Insertion.v.y:R}) m/s");
            Checks = new List<Check>
            {
                new Check("Mass accounting", "Wet mass reconciles with dry + propellant", "kg", 1e-6,
                    Math.Abs(v.Wet - v.Dry - v.LowerFuel - v.UpperFuel), 1e-6 - Math.Abs(v.Wet - v.Dry - v.LowerFuel - v.UpperFuel),
                    F($"wet {v.Wet:R}; dry {v.Dry:R}; lower fuel {v.LowerFuel:R}; upper fuel {v.UpperFuel:R} kg"),
                    "absolute residual = |wet − dry − lower fuel − upper fuel|", Catalog,
                    "Wet includes fairing and payload. The 1e-6 kg threshold is a numeric tolerance.",
                    "Constrained two-stage family", "Lower tank", "Use a supported stack."),
                Min("Fairing fit", "Internal width covers payload envelope", "m", v.PayloadWidth, v.FairingWidth,
                    F($"fairing {v.FairingWidth:R} m; spacecraft {v.PayloadWidth:R} m"), "internal width minus payload width",
                    Catalog, "Axisymmetric clearance envelope", "Folded spacecraft", "Fairing", "Install the wide fairing."),
                Flag("Propellant interfaces", v.FeedConnected && v.CompatibleFuel, "Upper feed closed and fuel compatible",
                    F($"feed connected {v.FeedConnected}; RP-1/LOX tank {v.CompatibleFuel}"), "connected AND compatible",
                    Catalog, "Stages have dedicated tanks. No cross-feed.", "Two serial stages; optional synchronized lower pair",
                    "Upper feed", "Close the upper feed and choose an RP-1/LOX tank."),
                Min("Ignition TWR", "Initial thrust exceeds threshold", "ratio", 1.20, v.TWR,
                    F($"{v.LowerThrust:R} N / ({v.Wet:R} kg * {Physics.G0:R} m/s²)"), "thrust / (wet mass × standard gravity)",
                    Physics.EarthSource + " | " + Catalog + " | " + Policy, "Nominal sea-level thrust; ratio gate includes design allowance.",
                    "Launch-pad ignition", "Lower tank", "Reduce pad mass or install the symmetric booster pair."),
                Flag("Staging order", v.StageOrder, "Lower separation precedes upper ignition and payload release",
                    string.Join(" → ", Staging.Sequences[design.stagingOrder]), "validate ordered separation, ignition, and release",
                    Policy, "Upper ignition follows lower separation atomically.", "Supported two-stage stack", "Staging", "Move lower burnout/separation to the first event and payload release to the last."),
                Min("Lower stage delta-v", "Ideal lower impulse allowance", "m/s", 2700, v.LowerDeltaV,
                    F($"wet {v.Wet:R} kg; burnout {v.Wet-v.LowerFuel:R} kg; Isp {Vehicle.LowerIsp:R} s; g0 {Physics.G0:R} m/s²"),
                    "g0 × Isp × ln(wet / burnout)", Physics.RocketSource + " | " + Catalog + " | " + Policy, "Ideal; neglects gravity, drag and fairing drop.",
                    "Core and optional matched-duration strap-on pair", "Lower tank", "Fit the larger core tank or reduce mass above it."),
                Min("Upper stage delta-v", "Ideal upper impulse allowance", "m/s", 5800, v.UpperDeltaV,
                    F($"wet {v.UpperWet:R} kg; burnout {v.UpperWet-v.UpperFuel:R} kg; Isp {Vehicle.UpperIsp:R} s; g0 {Physics.G0:R} m/s²"),
                    "g0 × Isp × ln(wet / burnout)", Physics.RocketSource + " | " + Catalog + " | " + Policy, "Ideal capacity; guidance can cut off before depletion.",
                    "Upper stage after fairing and lower separation", "Upper tank", "Install a larger compatible upper tank or reduce payload mass."),
                Min("Orbit insertion", "Periapsis clears the operations floor", "km", Physics.OperationsFloor / 1000, perigee, orbitInputs,
                    "integrate thrust, gravity and drag; ε=v²/2−μ/r; a=−μ/(2ε); periapsis=a(1−e)−R",
                    Physics.OrbitSource + " | " + Physics.EarthSource + " | " + Policy, "Guided prograde ascent, spherical rotating Earth, no J2; step ≤0.25 s.",
                    "Short equatorial LEO", "Staging", "Restore supported staging and feed, or reduce wet mass."),
                Flag("Power connectivity", v.BatteryConnected && v.SolarConnected, "Both battery and solar array reach the avionics bus",
                    F($"battery connected {v.BatteryConnected}; array connected {v.SolarConnected}"), "battery connection AND solar connection",
                    Catalog, "One fixed avionics bus with selectable breakers.", "Supported spacecraft bus", "Battery", "Close the open array or battery breaker."),
                Min("Battery reserve", "Keep the policy reserve through the longest predicted shadow", "Wh", Vehicle.Reserve, reserve,
                    F($"usable {v.Battery:R} Wh; eclipse load {v.DarkLoad:R} W; shadow {eclipseHours:R} h; draw {v.DarkLoad*eclipseHours:R} Wh; policy {Vehicle.Reserve:R} Wh"),
                    "predicted reserve = usable Wh − eclipse W × shadow hours; margin = predicted − policy",
                    Physics.EarthSource + " | " + Catalog + " | " + Policy, "Full battery entering longest shadow, cylindrical umbra; measured entry charge can vary.",
                    "One operating window; sunlight science and communications only", "Battery", "Install the extended battery and close its breaker."),
                Min("Communications access", "Minimum visible time with a connected antenna", "s", 150,
                    v.AntennaConnected ? contact : 0,
                    F($"geometric access {contact:R} s; antenna {v.AntennaConnected}; station mask 8 deg; c {Physics.Light:R} m/s"),
                    "sum one-second intervals above station mask; delay = slant range / c",
                    Physics.EarthSource + " | " + Physics.LightSource + " | " + Policy,
                    "Ideal tracked antenna and fixed data rate; no link-budget attenuation.", "One equatorial station", "Antenna", "Connect the steerable dish."),
                Min("Data storage", "Recorder holds at least one required delivery", "MB", Vehicle.DownlinkTarget, v.Storage,
                    F($"recorder {v.Storage:R} MB; delivery objective {Vehicle.DownlinkTarget:R} MB"), "recorder capacity minus delivery objective",
                    Catalog + " | " + Policy, "Recorder overflow is tracked separately.", "One payload stream", "Recorder", "Install the survey recorder."),
                new Check("Mission budget", "Cost fits the contract ceiling", "credits", Vehicle.Budget, v.Cost, Vehicle.Budget-v.Cost,
                    F($"catalogue sum {v.Cost:R}; ceiling {Vehicle.Budget:R}"), "ceiling minus catalogue sum", Catalog + " | " + Policy,
                    "Authored price units; no real hardware cost claim.", "Earth demonstrator", "Catalogue", "Remove an upgrade or the optional boosters."),
                Min("Flood scene delivery", "Confirm priority data from the Manaus target", "MB", Observation.TargetDelivery,
                    Forecast?.TargetDelivered ?? double.NaN,
                    F($"target {Observation.Latitude:R}°, {Observation.Longitude:R}°; gimbal {Observation.MaximumLookAngle:R}°; optics {Observation.SensorHalfAngle*2:R}°; rate {Vehicle.ScienceRate:R} MB/s"),
                    "project Earth-fixed target into inertial frame; gate sunlight, horizon and gimbal angle; prioritize its data during downlink",
                    Observation.Source + " | " + Physics.EarthSource + " | " + Catalog + " | " + Policy,
                    "Historical image locates the target. Simulated samples are abstract data. Flat footprint approximation.",
                    "One short equatorial operations window", "Payload", "Fit the optical camera and choose a launch Sun angle with daylight over Manaus."),
                Flag("Payload capability", v.HasImager, "Visible-light imaging payload fitted", F($"imager installed {v.HasImager}"),
                    "installed capability matches contract", Catalog + " | " + Policy, "Images are abstract data quantities.", "Daylight imaging only",
                    "Payload", "Fit the optical survey camera."),
                new Check("Thrust alignment", "Resultant upper thrust passes through the centreline", "N·m", 0, Math.Abs(v.Torque), -Math.Abs(v.Torque),
                    F($"offset {v.Offset:R} m; thrust {v.UpperThrust:R} N; torque {v.Torque:R} N·m"), "torque magnitude = absolute offset × thrust",
                    Catalog + " | " + Policy, "Off-axis torque is a launch-blocking engineering warning; attitude dynamics are outside this model.",
                    "Rigid axisymmetric launcher", "Upper engine", "Snap the engine to the centre socket.")
            }.AsReadOnly();
        }

        static Check Min(string name, string requirement, string units, double limit, double value,
            string inputs, string equation, string source, string assumptions, string range, string component, string fix)
            => new Check(name, requirement, units, limit, value, value - limit, inputs, equation, source, assumptions, range, component, fix);

        static Check Flag(string name, bool value, string requirement, string inputs, string equation,
            string source, string assumptions, string range, string component, string fix)
            => Min(name, requirement, "boolean", 1, value ? 1 : 0, inputs, equation, source, assumptions, range, component, fix);

        static string F(FormattableString s) => s.ToString(CultureInfo.InvariantCulture);
    }
}
