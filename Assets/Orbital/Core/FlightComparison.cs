using System;
using System.Collections.Generic;

namespace Orbital
{
    [Serializable]
    public sealed class FlightExpectations
    {
        public bool captured;
        public double periapsisKm, reserveWh, downlinkMb, priorityMb, windowSeconds;
        public double minimumPeriapsisKm, minimumReserveWh, minimumDownlinkMb, minimumPriorityMb;

        public static FlightExpectations Freeze(Review review) => new FlightExpectations
        {
            captured = true,
            periapsisKm = Physics.Elements(review.Insertion.r, review.Insertion.v).periapsis / 1000,
            reserveWh = review.Forecast.SimulatedMinimum,
            downlinkMb = review.Forecast.PredictedDelivery,
            priorityMb = review.Forecast.TargetDelivered,
            windowSeconds = review.Forecast.WindowSeconds,
            minimumPeriapsisKm = Physics.OperationsFloor / 1000,
            minimumReserveWh = Vehicle.Reserve,
            minimumDownlinkMb = Vehicle.DownlinkTarget,
            minimumPriorityMb = Observation.TargetDelivery
        };
    }

    public sealed class FlightComparison
    {
        public readonly string Metric, Unit;
        public readonly double Minimum;
        public readonly double? Prediction, Actual;
        public bool? Passed => Actual.HasValue ? Actual.Value >= Minimum : null;

        FlightComparison(string metric, string unit, double minimum, double? prediction, double? actual)
        {
            Metric = metric;
            Unit = unit;
            Minimum = minimum;
            Prediction = prediction;
            Actual = actual;
        }

        public static IEnumerable<FlightComparison> For(Flight flight)
        {
            var state = flight.State;
            var frozen = state.snapshot.expectations;
            bool captured = frozen?.captured == true;
            var baseline = captured ? frozen : FlightExpectations.Freeze(flight.Review);
            Operations actual = state.operations;
            Ascent insertion = state.ascent;
            double? periapsis = actual != null ? Physics.Elements(insertion.r, insertion.v).periapsis / 1000 : null;
            yield return new FlightComparison("Insertion periapsis", "km", baseline.minimumPeriapsisKm,
                captured ? baseline.periapsisKm : null, periapsis);
            yield return new FlightComparison("Minimum reserve", "Wh", baseline.minimumReserveWh,
                captured ? baseline.reserveWh : null, actual?.minimum);
            yield return new FlightComparison("Confirmed data", "MB", baseline.minimumDownlinkMb,
                captured ? baseline.downlinkMb : null, actual?.received);
            yield return new FlightComparison("Priority data", "MB", baseline.minimumPriorityMb,
                captured ? baseline.priorityMb : null, actual?.targetReceived);
            yield return new FlightComparison("Operations window", "s", baseline.windowSeconds,
                captured ? baseline.windowSeconds : null, actual?.elapsed);
        }
    }
}
