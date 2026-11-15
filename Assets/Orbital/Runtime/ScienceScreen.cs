using UnityEngine;

namespace Orbital
{
    public sealed partial class OrbitalGame
    {
        Texture2D beforeFlood, afterFlood;
        Page scienceBack = Page.Plan;

        void DrawScience()
        {
            if (beforeFlood == null) beforeFlood = Resources.Load<Texture2D>("manaus-2004");
            if (afterFlood == null) afterFlood = Resources.Load<Texture2D>("manaus-2009");
            Text(34, 148, 1160, 38, "SCIENCE LAB / AMAZON–NEGRO CONFLUENCE", heading, Ink);
            Card(new Rect(34, 193, 378, 386), "HISTORICAL REFERENCE / 7 JUNE 2004");
            Card(new Rect(424, 193, 378, 386), "HISTORICAL REFERENCE / 29 JUNE 2009");
            if (beforeFlood != null) GUI.DrawTexture(new Rect(45, 224, 356, 313), beforeFlood, ScaleMode.ScaleToFit);
            if (afterFlood != null) GUI.DrawTexture(new Rect(435, 224, 356, 313), afterFlood, ScaleMode.ScaleToFit);
            Text(47, 544, 357, 26, "NASA EO-1 / ALI  •  BASELINE SCENE", mono, Muted);
            Text(437, 544, 357, 26, "NASA EO-1 / ALI  •  HIGH WATER SCENE", mono, Muted);
            Card(new Rect(815, 193, 431, 386), "SIMULATED MANAUS TARGET");
            Operations o = scienceBack == Page.Evidence ? flight?.State.operations : null;
            Forecast model = (scienceBack == Page.Evidence ? flight?.Review : review)?.Forecast;
            double width = o?.firstFootprint ?? model?.Footprint ?? 0;
            double sampling = o?.firstSampling ?? model?.Sampling ?? 0;
            double revisit = o?.revisit ?? model?.Revisit ?? 0;
            Metric(834, 235, 188, "APPROX. FOOTPRINT", width > 0 ? N(width / 1000) + " km" : "Unavailable");
            Metric(1025, 235, 207, "PIXEL SAMPLING", sampling > 0 ? N(sampling) + " m" : "Unavailable");
            Text(834, 309, 390, 81, "The optical imager must have a sunlit target, clear horizon and a gimbal angle at or below 57°. Priority samples are sent first during ground access.", body, Ink);
            Text(834, 400, 394, 108,
                $"Priority receipt {(o == null ? "forecast" : "recorded")}: {N(o?.targetReceived ?? model?.TargetDelivered ?? double.NaN)} MB\nRevisit: {(revisit > 0 ? N(revisit/60) + " min" : "no repeat in this window")}\nCapture to first receipt: {(o != null && o.firstTargetReceipt > 0 ? N((o.firstTargetReceipt-o.firstObservation)/60) + " min" : "see flight evidence")}",
                body, Muted);
            Text(34, 600, 928, 59, "Both images are historical references. Jesse Allen / NASA Earth Observatory using NASA EO-1 ALI data. The simulation records sampling and delivery quantities.", small, Muted);
            if (Button(new Rect(1042, 608, 204, 40), "science-back", "Return", true)) Go(scienceBack);
        }
    }
}
