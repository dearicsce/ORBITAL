using System;

namespace Orbital
{
    public static class Observation
    {
        public const string Source = "https://science.nasa.gov/earth/earth-observatory/flooding-near-manaus-brazil-39359/";
        public const double Latitude = -3.15;
        public const double Longitude = -59.93;
        public const double MaximumLookAngle = 57;
        public const double SensorHalfAngle = 10;
        public const double DetectorPixels = 2048;
        public const double TargetDelivery = 2;

        public static (bool accessible, double lookAngle, double width, double sampling) Geometry(Vec r, double clock, Vec sun)
        {
            double latitude = Latitude * Physics.Degree;
            Vec meridian = Vec.At(Longitude * Physics.Degree + clock * Physics.Spin);
            Vec targetXY = meridian * (Physics.Radius * Math.Cos(latitude));
            double targetZ = Physics.Radius * Math.Sin(latitude);
            Vec sight = targetXY - r;
            double slant = Math.Sqrt(Vec.Dot(sight, sight) + targetZ * targetZ);
            double offNadir = Math.Acos(Math.Min(1, Math.Max(-1, Vec.Dot(sight, r.Unit * -1) / slant)));
            bool clear = Vec.Dot(r, targetXY) > Physics.Radius * Physics.Radius;
            bool daylight = Vec.Dot(sun, targetXY) > Physics.Radius * Math.Sin(10 * Physics.Degree);
            double width = 2 * slant * Math.Tan(SensorHalfAngle * Physics.Degree);
            return (clear && daylight && offNadir <= MaximumLookAngle * Physics.Degree, offNadir / Physics.Degree, width, width / DetectorPixels);
        }
    }
}
