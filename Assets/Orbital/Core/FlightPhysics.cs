using System;

namespace Orbital
{
    // Equatorial inertial frame: +X is the launch meridian at t=0, +Y is east.
    [Serializable]
    public struct Vec
    {
        public double x, y;
        public Vec(double x, double y) { this.x = x; this.y = y; }
        public double Length => Math.Sqrt(x * x + y * y);
        public Vec Unit => this / Length;
        public Vec East => new Vec(-y, x);
        public static Vec operator +(Vec a, Vec b) => new Vec(a.x + b.x, a.y + b.y);
        public static Vec operator -(Vec a, Vec b) => new Vec(a.x - b.x, a.y - b.y);
        public static Vec operator *(Vec a, double k) => new Vec(a.x * k, a.y * k);
        public static Vec operator /(Vec a, double k) => a * (1 / k);
        public static double Dot(Vec a, Vec b) => a.x * b.x + a.y * b.y;
        public static double Cross(Vec a, Vec b) => a.x * b.y - a.y * b.x;
        public static Vec At(double angle) => new Vec(Math.Cos(angle), Math.Sin(angle));
    }

    public static class Physics
    {
        public const double Radius = 6378137;
        public const double Mu = 3.986e14;
        public const double G0 = 9.80665;
        public const double Light = 299792458;
        public const double Spin = 2 * Math.PI / 86164.0905;
        public const double Degree = Math.PI / 180;
        public const double Step = .25;
        public const double OrbitStep = 1;
        public const double OperationsFloor = 150000;
        public const string EarthSource = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html";
        public const string RocketSource = "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/";
        public const string OrbitSource = "https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/";
        public const string LightSource = "https://www.bipm.org/en/measurement-units/si-defining-constants";
        public static Vec Gravity(Vec r) => r * (-Mu / Math.Pow(r.Length, 3));
        public static double Speed(double radius) => Math.Sqrt(Mu / radius);
        public static double DeltaV(double wet, double dry, double isp) => G0 * isp * Math.Log(wet / dry);
        public static double Energy(Vec r, Vec v) => Vec.Dot(v, v) / 2 - Mu / r.Length;

        public static (double periapsis, double apoapsis, double period) Elements(Vec r, Vec v)
        {
            double energy = Energy(r, v);
            if (energy >= 0) return (-1, double.PositiveInfinity, double.PositiveInfinity);
            double a = -Mu / (2 * energy), h = Vec.Cross(r, v);
            double e = Math.Sqrt(Math.Max(0, 1 - h * h / (Mu * a)));
            return (a * (1 - e) - Radius, a * (1 + e) - Radius, 2 * Math.PI * Math.Sqrt(a * a * a / Mu));
        }

        public static void Propagate(ref Vec r, ref Vec v, double dt)
        {
            Vec start = Gravity(r);
            r += v * dt + start * (.5 * dt * dt);
            v += (start + Gravity(r)) * (.5 * dt);
        }

        public static bool Shadow(Vec r, Vec sun) => Vec.Dot(r, sun) < 0 && Math.Abs(Vec.Cross(r, sun)) < Radius;

        public static Vec Station(double seconds) => Vec.At(Spin * seconds) * Radius;

        public static (double elevation, double delay, bool occulted, bool visible) Link(Vec r, double seconds)
        {
            Vec station = Station(seconds), path = r - station;
            double elevation = Math.Asin(Math.Max(-1, Math.Min(1, Vec.Dot(path.Unit, station.Unit)))) / Degree;
            return (elevation, path.Length / Light, elevation < 0, elevation >= 8);
        }
    }

    [Serializable]
    public sealed class Ascent
    {
        public Vec r, v;
        public double seconds, stageFuel, mass, pitch, spent, jettisoned, stageTime;
        public double boosterFuel, boosterTime, fairingTime;
        public int stage;
        public bool failed, fairingGone, boosterTracked, boosterGone;
        public string failure;
        public double Height => r.Length - Physics.Radius;

        public static Ascent Start(Vehicle vehicle) => new Ascent
        {
            r = new Vec(Physics.Radius, 0), v = new Vec(0, Physics.Spin * Physics.Radius),
            mass = vehicle.Wet, stageFuel = vehicle.LowerFuel, pitch = 90,
            boosterTracked = vehicle.BoosterFuel > 0, boosterFuel = vehicle.BoosterFuel
        };

        public void Advance(Vehicle vehicle, double maximumStep = Physics.Step)
        {
            if (stage == 2 || failed) return;
            if (stage == 0 && !boosterTracked && vehicle.BoosterFuel > 0)
            {
                // Older checkpoints tracked the two matched-duration burns as one tank.
                boosterTracked = true;
                boosterFuel = stageFuel * vehicle.BoosterFuel / vehicle.LowerFuel;
            }
            bool boosterAttached = stage == 0 && boosterTracked && !boosterGone;
            if (boosterAttached && boosterFuel <= 1e-7)
            {
                boosterGone = true;
                boosterTime = seconds;
                mass -= vehicle.BoosterDry + boosterFuel;
                jettisoned += vehicle.BoosterDry + boosterFuel;
                stageFuel -= boosterFuel;
                boosterFuel = 0;
                return;
            }
            Vec up = r.Unit, along = up.East;
            double radial = Vec.Dot(v, up), tangential = Vec.Dot(v, along);
            if (stage == 1 && tangential >= Physics.Speed(r.Length))
            {
                if (!fairingGone) { failed = true; failure = "Fairing clearance was never reached."; return; }
                var orbit = Physics.Elements(r, v);
                if (orbit.periapsis < Physics.OperationsFloor || !double.IsFinite(orbit.apoapsis))
                {
                    failed = true;
                    failure = "Insertion did not establish a bound orbit above the operations floor.";
                    return;
                }
                jettisoned += mass - vehicle.PayloadMass;
                mass = vehicle.PayloadMass;
                stageFuel = 0;
                stage = 2;
                return;
            }
            if (stageFuel <= 1e-7)
            {
                if (stage == 1) { failed = true; failure = "Upper stage depleted before insertion speed."; return; }
                double discarded = vehicle.LowerDry - vehicle.BoosterDry;
                mass -= discarded;
                jettisoned += discarded;
                stage = 1;
                stageTime = seconds;
                stageFuel = vehicle.UpperFuel;
                return;
            }

            double thrust = stage == 0 ? boosterAttached ? vehicle.LowerThrust : Vehicle.CoreThrust : vehicle.UpperThrust;
            double isp = stage == 0 ? Vehicle.LowerIsp : Vehicle.UpperIsp;
            double flow = thrust / (Physics.G0 * isp);
            double dt = Math.Min(maximumStep, stageFuel / flow);
            double boosterFlow = boosterAttached ? vehicle.BoosterThrust / (Physics.G0 * isp) : 0;
            if (boosterAttached)
            {
                dt = Math.Min(dt, boosterFuel / boosterFlow);
                dt = Math.Min(dt, (stageFuel - boosterFuel) / (flow - boosterFlow));
            }
            pitch = stage == 0
                ? (seconds < 7 ? 90 : 90 * Math.Exp(-(seconds - 7) / 220))
                : Math.Max(-38, Math.Min(42, (270000 - Height - radial * 160) / 6500));
            double angle = pitch * Physics.Degree;
            Vec force = (up * Math.Sin(angle) + along * Math.Cos(angle)) * thrust;
            double midMass = mass - flow * dt / 2;
            Vec a = Acceleration(r, v, force, midMass, vehicle.DragArea);
            Vec midR = r + v * (dt / 2);
            Vec midV = v + a * (dt / 2);
            r += midV * dt;
            v += Acceleration(midR, midV, force, midMass, vehicle.DragArea) * dt;
            seconds += dt;
            mass -= flow * dt;
            stageFuel -= flow * dt;
            boosterFuel = Math.Max(0, boosterFuel - boosterFlow * dt);
            spent += flow * dt;

            if (Height >= 90000 && !fairingGone)
            {
                mass -= vehicle.FairingMass;
                jettisoned += vehicle.FairingMass;
                fairingGone = true;
                fairingTime = seconds;
            }
            if (Height < -1 || seconds > 900)
            {
                failed = true;
                failure = Height < -1 ? "The trajectory intersected Earth." : "Ascent exceeded the guidance envelope.";
            }
        }

        static Vec Acceleration(Vec r, Vec v, Vec thrust, double mass, double area)
        {
            double density = 1.225 * Math.Exp(-Math.Max(0, r.Length - Physics.Radius) / 7200);
            Vec relative = v - r.East * Physics.Spin;
            Vec drag = relative * (.5 * density * .38 * area * relative.Length);
            return Physics.Gravity(r) + (thrust - drag) / mass;
        }

        public static Ascent Predict(Vehicle vehicle, double step = Physics.Step)
        {
            Ascent ascent = Start(vehicle);
            while (ascent.stage < 2 && !ascent.failed) ascent.Advance(vehicle, step);
            return ascent;
        }
    }
}
