using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Text;
using UnityEngine;

namespace Orbital
{
    [Serializable]
    public sealed class NamedBlueprint
    {
        public string name, importedId;
        public Blueprint design;
    }

    [Serializable]
    public sealed class Profile
    {
        public int version = 1, academy, coins, browserWallet;
        public bool completed;
        public Blueprint design = new Blueprint();
        public List<NamedBlueprint> rockets = new List<NamedBlueprint>();
        public List<NamedBlueprint> spacecraft = new List<NamedBlueprint>();
        public List<string> browserCompleted = new List<string>();
        public List<string> browserUnlocks = new List<string>();
        public string importNote, browserExportedAt;

        public void Validate()
        {
            if (version != 1 || design == null || !design.Valid || coins < 0 || browserWallet < 0
                || academy < 0 || academy > 8 || rockets == null || spacecraft == null
                || browserCompleted == null || browserUnlocks == null)
                throw new IOException("Unsupported or incomplete profile.");
            foreach (var entries in new[] { rockets, spacecraft })
                foreach (var entry in entries)
                    if (entry == null || string.IsNullOrWhiteSpace(entry.name) || entry.design == null || !entry.design.Valid)
                        throw new IOException("Invalid saved blueprint.");
        }
    }

    public static class Persistence
    {
        public static string Folder => Environment.GetEnvironmentVariable("ORBITAL_PROFILE_DIR") is string local && Path.IsPathRooted(local)
            ? local : Application.persistentDataPath;
        public static string PathFor(string name) => Path.Combine(Folder, name);

        public static void Write(string path, string contents)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            string temp = path + ".tmp";
            File.WriteAllText(temp, contents, new UTF8Encoding(false));
            if (File.Exists(path)) File.Replace(temp, path, path + ".bak");
            else File.Move(temp, path);
        }

        public static T Read<T>(string name) where T : class
        {
            string path = PathFor(name);
            if (!File.Exists(path)) return null;
            var result = JsonUtility.FromJson<T>(File.ReadAllText(path));
            if (result == null) throw new IOException("Could not read " + name);
            return result;
        }

        public static void Save(string name, object value) => Write(PathFor(name), JsonUtility.ToJson(value, true));

        public static FlightState ReadFlight()
        {
            string path = PathFor("flight.json");
            return File.Exists(path) ? DecodeFlight(File.ReadAllText(path)) : null;
        }

        public static FlightState DecodeFlight(string json)
        {
            var state = JsonUtility.FromJson<FlightState>(json);
            if (state == null) throw new IOException("Could not read flight.json");
            // JsonUtility writes null inline classes as default instances.
            // A real operations record is still required after insertion.
            if (state.ascent?.stage < 2 && state.operations != null
                && JsonUtility.ToJson(state.operations) == JsonUtility.ToJson(new Operations()))
                state.operations = null;
            return state;
        }

        public static bool ApplyReward(Profile profile, Flight flight)
        {
            if (!flight.Success || profile.completed || profile.browserCompleted.Contains(Review.Mission)) return false;
            profile.completed = true;
            profile.coins += 100;
            return true;
        }

        public static string Export(Review review, Flight flight)
        {
            string identity = string.IsNullOrEmpty(flight?.State.runId) ? review.Revision.Substring(0, 12) : flight.State.runId;
            string path = PathFor("ORBITAL-" + identity + (flight == null ? "-review" : "-debrief") + ".html");
            Write(path, Report(review, flight));
            if (flight != null)
            {
                var csv = new StringBuilder("mission_id,run_id,revision,model_version,time_s,altitude_m,speed_m_s,charge_Wh,received_MB,stored_MB,sent_MB,mass_kg,x_m,y_m,vx_m_s,vy_m_s\n");
                foreach (Sample s in flight.State.samples)
                    csv.AppendLine(F($"{Review.Mission},{flight.State.runId},{review.Revision},{Review.Version},{s.time:R},{s.altitude:R},{s.speed:R},{s.charge:R},{s.received:R},{s.stored:R},{s.sent:R},{s.mass:R},{s.x:R},{s.y:R},{s.vx:R},{s.vy:R}"));
                Write(Path.ChangeExtension(path, ".csv"), csv.ToString());
            }
            return path;
        }

        public static string Report(Review review, Flight flight)
        {
            if (flight != null && !flight.State.snapshot.Matches(review))
                throw new InvalidOperationException("Flight evidence belongs to a different review.");
            var html = new StringBuilder(@"<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>ORBITAL Engineering Dossier</title><style>
body{font:16px system-ui;line-height:1.6;max-width:1024px;margin:auto;padding:2rem;color:#18293b;background:#f5f8fb}h1,h2,h3{line-height:1.2}article{background:white;border-left:4px solid #438b90;margin:1rem 0;padding:1rem 1.3rem}code{overflow-wrap:anywhere}a{color:#166377}dt{font-weight:700}dd{margin:0 0 .4rem}pre{white-space:pre-wrap}</style>
<h1>ORBITAL · Engineering dossier</h1><p>Floodwatch / Earth mission m1</p>");
            html.Append("<p>Model <code>").Append(E(Review.Version)).Append("</code><br>Blueprint revision <code>")
                .Append(E(review.Revision)).Append("</code></p><details><summary>Frozen blueprint JSON</summary><pre>")
                .Append(E(JsonUtility.ToJson(flight?.State.snapshot ?? FlightSnapshot.Freeze(review), true))).Append("</pre></details>");
            if (flight != null)
            {
                html.Append("<h2>Outcome comparison</h2><p>Run ").Append(E(flight.State.runId ?? "legacy checkpoint"))
                    .Append(" · ").Append(flight.State.finished ? flight.Success ? "Mission complete" : "Objective missed" : "Flight in progress")
                    .Append("</p><table><thead><tr><th>Metric</th><th>Minimum</th><th>Launch forecast</th><th>Actual</th><th>Result</th></tr></thead><tbody>");
                foreach (var row in FlightComparison.For(flight))
                    html.Append("<tr><td>").Append(E(row.Metric + " (" + row.Unit + ")")).Append("</td><td>")
                        .Append(F($"{row.Minimum:R}")).Append("</td><td>").Append(row.Prediction?.ToString("R", CultureInfo.InvariantCulture) ?? "Unavailable")
                        .Append("</td><td>").Append(row.Actual?.ToString("R", CultureInfo.InvariantCulture) ?? "Unavailable")
                        .Append("</td><td>").Append(row.Passed == true ? "Pass" : row.Passed == false ? "Fail" : "Unavailable").Append("</td></tr>");
                html.Append("</tbody></table>");
                if (!string.IsNullOrEmpty(flight.State.ascent.failure)) html.Append("<p>").Append(E(flight.State.ascent.failure)).Append("</p>");
                html.Append("<h2>Flight events</h2><ol>");
                foreach (string entry in flight.State.events) html.Append("<li>").Append(E(entry)).Append("</li>");
                html.Append("</ol>");
            }
            if (flight?.State.operations != null)
            {
                Operations o = flight.State.operations;
                html.Append("<h2>Flight evidence</h2><p>").Append(E(F($"Longest recorded shadow {o.longestDark:F3} s. Generated {o.generated:F6} Wh; supplied {o.supplied:F6} Wh; spilled {o.spilled:F6} Wh; unserved {o.unserved:F6} Wh. Collected {o.collected:F6} MB; stored {o.stored:F6} MB; sent {o.sent:F6} MB; received {o.received:F6} MB; overflow {o.lost:F6} MB.")))
                    .Append("</p><h2>Science evidence</h2><p>").Append(E(F(
                    $"Manaus priority data collected {o.targetCollected:F3} MB; received {o.targetReceived:F3} MB. First sample footprint {o.firstFootprint/1000:F1} km; approximate sampling {o.firstSampling:F1} m per pixel. First capture T+{o.firstObservation:F3} s; first receipt T+{o.firstTargetReceipt:F3} s.")))
                    .Append("</p><p>Priority data can displace background samples in the recorder. A zero event time indicates that no event was logged. Historical EO-1 imagery in the game is reference material.</p>");
                html.Append("<h2>Command timeline</h2><p>Deterministic scenario seed ").Append(flight.State.seed)
                    .Append(". Times use the simulation clock. A zero time indicates a command phase has not been reached.</p><ul>");
                foreach (FlightCommand command in flight.State.commands)
                    html.Append("<li>").Append(E(F($"{command.Description} · {command.status} · requested {command.requested:F3}; sent {command.sent:F3}; received {command.received:F3}; executed {command.executed:F3}; confirmation due {command.confirmed:F3}"))).Append("</li>");
                html.Append("</ul>");
            }
            html.Append("<h2>Reviewed checks</h2>");
            foreach (Check c in review.Checks)
            {
                html.Append("<article><h3>").Append(E(c.Name)).Append(" · ").Append(E(c.Status.ToString())).Append("</h3><dl>");
                Field(html, "Requirement", c.Requirement);
                Field(html, "Prediction / threshold / margin", F($"{Number(c.Value)} / {Number(c.Limit)} / {Number(c.Margin)} {c.Units}"));
                Field(html, "Inputs", c.Inputs);
                Field(html, "Algorithm", c.Equation);
                Field(html, "Assumptions", c.Assumptions);
                Field(html, "Model version and range", c.Version + " · " + c.Range);
                html.Append("<dt>Sources</dt><dd>");
                foreach (string source in c.Source.Split(new[] { " | " }, StringSplitOptions.None))
                {
                    if (source.StartsWith("https://", StringComparison.Ordinal))
                        html.Append("<a href=\"").Append(E(source)).Append("\">").Append(E(source)).Append("</a><br>");
                    else html.Append(E(source)).Append("<br>");
                }
                html.Append("</dd>");
                if (c.Status != Verdict.Pass) Field(html, "Corrective action", c.Fix);
                html.Append("</dl></article>");
            }
            return html.Append("<p>Educational simulation. Component specifications and difficulty policies are authored for ORBITAL. This report records evidence; launch authorization is recomputed in the game.</p></html>").ToString();
        }

        static void Field(StringBuilder html, string name, string value) =>
            html.Append("<dt>").Append(E(name)).Append("</dt><dd>").Append(E(value)).Append("</dd>");

        static string F(FormattableString value) => value.ToString(CultureInfo.InvariantCulture);
        static string E(string value) => WebUtility.HtmlEncode(value);
        static string Number(double value) => double.IsNaN(value) || double.IsInfinity(value)
            ? "Unavailable" : value.ToString("R", CultureInfo.InvariantCulture);
    }
}
