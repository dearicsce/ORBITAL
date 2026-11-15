using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Orbital
{
    public sealed partial class OrbitalGame
    {
        IReadOnlyList<Trial> trials;
        string trialRevision;

        void DrawTrials()
        {
            if (trialRevision != review.Revision)
            {
                trials = Robustness.Evaluate(review);
                trialRevision = review.Revision;
            }
            Text(34, 148, 1160, 38, "ROBUSTNESS TRIALS / ELECTRICAL RESERVE", heading, Ink);
            Card(new Rect(34, 193, 737, 423), "NINE BOUNDED TRIALS / SAME ASCENT AND OPERATIONS");
            Card(new Rect(788, 193, 458, 423), "AUTHORED UNCERTAINTY RANGES");
            if (trials.Count == 0)
                Text(52, 266, 680, 57, "The current design has no applicable orbital forecast for electrical trials.", body, Muted);
            Text(52, 232, 691, 24, "CAPACITY        SOLAR OUTPUT        MINIMUM RESERVE        DATA RECEIVED        RESULT", mono, Muted);
            for (int i = 0; i < trials.Count; i++)
            {
                Trial row = trials[i];
                float y = 266 + 35 * i;
                Box(new Rect(51, y - 4, 703, 31), i % 2 == 0 ? Raised : Panel);
                Text(56, y, 132, 25, N(row.capacity * 100, "F0") + "%", body, Ink);
                Text(177, y, 147, 25, N(row.output * 100, "F0") + "%", body, Ink);
                Text(331, y, 148, 25, N(row.reserve, "F2") + " Wh", body, Ink);
                Text(491, y, 155, 25, N(row.downlink) + " MB", body, Ink);
                Text(654, y, 92, 25, row.MeetsTargets ? "PASS" : "MISS", mono, row.MeetsTargets ? Mint : Red);
            }
            Metric(806, 239, 411, "TRIALS MEETING ALL TARGETS", $"{trials.Count(t => t.MeetsTargets)} / {trials.Count}");
            Text(806, 314, 411, 142, "The grid combines battery capacity at 92%, 100% and 108% with array output at 90%, 100% and 110%. It holds mass, trajectory, lighting and command assumptions fixed.", body, Ink);
            Text(806, 470, 411, 96, "The bounds are authored for the exercise. They describe sensitivity to the selected inputs and do not estimate failure probability. The nominal review authorizes launch.", small, Muted);
            if (Button(new Rect(1039, 630, 207, 35), "trials-back", "Return to review", true)) Go(Page.Review);
        }
    }
}
