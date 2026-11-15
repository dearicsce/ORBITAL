using System.Collections.Generic;

namespace Orbital
{
    public sealed class Trial
    {
        public double capacity, output, reserve, downlink, target;
        public bool MeetsTargets => reserve >= Vehicle.Reserve && downlink >= Vehicle.DownlinkTarget && target >= Observation.TargetDelivery;
    }

    public static class Robustness
    {
        public static IReadOnlyList<Trial> Evaluate(Review review)
        {
            var results = new List<Trial>(9);
            if (review.Forecast == null) return results;
            foreach (double capacity in new[] { .92, 1, 1.08 })
                foreach (double output in new[] { .90, 1, 1.10 })
                {
                    var vehicle = new Vehicle(review.Design, capacity, output);
                    var prediction = Forecast.Calculate(vehicle, review.Insertion);
                    results.Add(new Trial
                    {
                        capacity = capacity, output = output, reserve = prediction.SimulatedMinimum,
                        downlink = prediction.PredictedDelivery, target = prediction.TargetDelivered
                    });
                }
            return results;
        }
    }
}
