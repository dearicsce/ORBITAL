using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;

namespace Orbital
{
    [Serializable]
    public sealed class CampaignRecord
    {
        public string id, name, objective;
        public string[] requires;
        public int level;
    }

    [Serializable]
    public sealed class CampaignIndex
    {
        public int schemaVersion;
        public CampaignRecord[] records;
    }

    [Serializable]
    public sealed class LegacyCompletion
    {
        public string id;
        public double stars;
    }

    [Serializable]
    public sealed class LegacyCraft
    {
        public string id, name;
        public int schemaVersion, version;
        public LegacyAssembly assembly;
        public LegacyRocketParts parts;
        public string[] staging;
    }

    [Serializable]
    public sealed class LegacyAssembly
    {
        public string busId;
        public LegacyPart[] components;
    }

    [Serializable]
    public sealed class LegacyPart
    {
        public string catalogId, placementStatus, attachmentSurfaceId;
    }

    [Serializable]
    public sealed class LegacyRocketParts
    {
        public string coreTank, coreEngine, upperTank, upperEngine, separator, adapter, fairing, guidance, boosters;
    }

    [Serializable]
    public sealed class LegacyTransfer
    {
        public int schemaVersion, coins, academyFurthest;
        public string format, exportedAt;
        public LegacyCompletion[] completed;
        public string[] unlocks;
        public LegacyCraft[] spacecraft, launchers;
    }

    public static class BrowserMigration
    {
        public static Profile Prepare(Profile existing, CampaignIndex campaign, string json)
        {
            if (json == null || json.Length > 2000000) throw new IOException("The browser export must be under 2 MB.");
            var export = JsonUtility.FromJson<LegacyTransfer>(json);
            if (export == null || export.schemaVersion != 1 || export.format != "orbital-browser-transfer"
                || export.completed == null || export.unlocks == null || export.spacecraft == null || export.launchers == null
                || export.coins < 0 || export.academyFurthest < 0 || export.academyFurthest > 8
                || export.completed.Any(x => x == null || string.IsNullOrWhiteSpace(x.id) || !double.IsFinite(x.stars) || x.stars < 0 || x.stars > 5)
                || export.unlocks.Any(x => string.IsNullOrWhiteSpace(x) || x.Length > 100))
                throw new IOException("Invalid or unsupported ORBITAL browser export.");
            var result = JsonUtility.FromJson<Profile>(JsonUtility.ToJson(existing));
            var supported = new HashSet<string>(campaign.records.Select(x => x.id));
            string[] known = export.completed.Select(x => x.id).Where(supported.Contains).Distinct().ToArray();
            if (known.Contains(Review.Mission) && result.completed && !result.browserCompleted.Contains(Review.Mission))
                result.coins = Math.Max(0, result.coins - 100);
            result.browserCompleted = result.browserCompleted.Union(known).ToList();
            result.browserUnlocks = result.browserUnlocks.Union(export.unlocks).ToList();
            if (DateTimeOffset.TryParse(export.exportedAt, out var stamp))
            {
                if (!DateTimeOffset.TryParse(result.browserExportedAt, out var previous) || stamp > previous)
                {
                    result.browserExportedAt = stamp.ToUniversalTime().ToString("O");
                    result.browserWallet = export.coins;
                }
            }
            else if (string.IsNullOrEmpty(result.browserExportedAt)) result.browserWallet = Math.Max(result.browserWallet, export.coins);
            int ships = Adapt(export.spacecraft, result.spacecraft, Ship);
            int rockets = Adapt(export.launchers, result.rockets, Rocket);
            string unknown = string.Join(", ", export.completed.Select(x => x.id).Where(x => !supported.Contains(x)).Distinct());
            result.importNote = $"{known.Length} completions and {export.unlocks.Distinct().Count()} unlock IDs. " +
                $"{ships}/{export.spacecraft.Length} spacecraft and {rockets}/{export.launchers.Length} launcher blueprints have native equivalents. " +
                "All originals, unsupported hardware, Academy and reward records are retained in the archive." +
                (unknown.Length == 0 ? "" : " Unrecognized contracts archived: " + unknown + ".");
            return result;
        }

        static int Adapt(LegacyCraft[] originals, List<NamedBlueprint> destination, Func<LegacyCraft, Blueprint> convert)
        {
            int mapped = 0;
            foreach (LegacyCraft original in originals)
            {
                if (original == null || string.IsNullOrWhiteSpace(original.id) || string.IsNullOrWhiteSpace(original.name)) continue;
                Blueprint design = convert(original);
                if (design == null) continue;
                mapped++;
                if (destination.Any(x => x.importedId == original.id)) continue;
                destination.Add(new NamedBlueprint
                {
                    name = (original.name.Length <= 26 ? original.name : original.name.Substring(0, 26)) + " · adapted",
                    importedId = original.id,
                    design = design
                });
            }
            return mapped;
        }

        static Blueprint Ship(LegacyCraft item)
        {
            LegacyPart[] parts = item.assembly?.components;
            if (item.schemaVersion != 1 || item.assembly?.busId != "bus_small" || parts == null || parts.Length != 7
                || parts.Any(p => p == null || p.placementStatus != "placed")) return null;
            if (parts.Count(p => p.catalogId == "optical_camera") != 1 || parts.Count(p => p.catalogId == "comms_x_band") != 1
                || parts.Count(p => p.catalogId == "computer_basic") != 1 || parts.Count(p => p.catalogId == "pointing_reaction_wheels") != 1)
                return null;
            string[] batteries = { "battery_s", "battery_m", "battery_l" };
            int tier = Array.FindIndex(batteries, id => parts.Count(p => p.catalogId == id) == 1);
            var left = parts.FirstOrDefault(p => p.attachmentSurfaceId == "left" && (p.catalogId == "panel_m" || p.catalogId == "panel_l"));
            var right = parts.FirstOrDefault(p => p.attachmentSurfaceId == "right" && p.catalogId == left?.catalogId);
            if (tier < 0 || left == null || right == null) return null;
            return new Blueprint { battery = tier, array = left.catalogId == "panel_l" ? 1 : 0 };
        }

        static Blueprint Rocket(LegacyCraft item)
        {
            var p = item.parts;
            if (item.version != 1 || p == null || item.staging == null || !item.staging.SequenceEqual(
                new[] { "ignition", "core-separation", "fairing-release", "upper-cutoff", "payload-release" })) return null;
            bool courier = p.coreTank == "core-18" && p.coreEngine == "core-k1" && p.separator == "sep-18";
            bool expedition = p.coreTank == "core-28" && p.coreEngine == "core-k3" && p.separator == "sep-reducer";
            if ((!courier && !expedition) || p.upperTank != "upper-18" || p.upperEngine != "upper-k1"
                || p.adapter != "adapter-18" || p.guidance != "guidance-1"
                || (p.fairing != "fairing-18" && p.fairing != "fairing-wide") || !string.IsNullOrEmpty(p.boosters))
                return null;
            return new Blueprint { lowerTank = expedition ? 1 : 0 };
        }
    }

    public sealed partial class OrbitalGame
    {
        CampaignIndex campaign;
        CampaignRecord selectedRecord;
        string importPath = "";
        Vector2 atlasScroll;
        static readonly string[] Levels = { "Earth neighbourhood", "Solar system", "Nearby stars", "Milky Way" };

        void LoadCampaign()
        {
            campaign = atlasData != null ? JsonUtility.FromJson<CampaignIndex>(atlasData.text) : new CampaignIndex { records = Array.Empty<CampaignRecord>() };
            selectedRecord = campaign.records.FirstOrDefault(x => x.id == Review.Mission);
        }

        void DrawAtlas()
        {
            Text(34, 148, 760, 38, "CAMPAIGN ATLAS / " + Levels[mapLevel].ToUpperInvariant(), heading, Ink);
            DrawViewportTrim("CAMPAIGN MAP  /  PREREQUISITES");
            for (int i = 0; i < Levels.Length; i++)
            {
                if (Button(new Rect(48 + i * 184, 218, 177, 32), "atlas-" + i, Levels[i], mapLevel == i))
                {
                    mapLevel = i;
                    selectedRecord = campaign.records.FirstOrDefault(x => x.level == i);
                    atlasScroll = Vector2.zero;
                }
            }
            if (mapLevel == 0) Text(51, 593, 720, 24, "EARTH & LOCAL ORBIT SHARE A SCALE   •   BREADCRUMBS EXPAND THE MAP", mono, Muted);
            else DrawSchematic();
            Card(new Rect(823, 185, 423, 444), mapImports ? "BROWSER SAVE MIGRATION" : "CONTRACT INDEX");
            if (mapImports) DrawImport();
            else
            {
                CampaignRecord[] records = campaign.records.Where(m => m.level == mapLevel).ToArray();
                atlasScroll = GUI.BeginScrollView(new Rect(840, 219, 389, 199), atlasScroll, new Rect(0, 0, 367, Math.Max(199, records.Length * 35)));
                for (int i = 0; i < records.Length; i++)
                {
                    CampaignRecord record = records[i];
                    string suffix = Completed(record.id) ? "  ✓" : "";
                    if (Button(new Rect(0, 35 * i, 366, 31), "record-" + i, record.name + suffix, record == selectedRecord))
                        selectedRecord = record;
                }
                GUI.EndScrollView();
                if (selectedRecord != null)
                {
                    string needs = selectedRecord.requires.Length == 0 ? "None"
                        : string.Join(", ", selectedRecord.requires.Select(id => campaign.records.FirstOrDefault(x => x.id == id)?.name ?? id));
                    Text(843, 430, 379, 80, "Prerequisites  /  " + needs + "\n" + (selectedRecord.id == Review.Mission ? "Playable in this Unity build" : "Browser campaign record"), body, Ink);
                    if (selectedRecord.id == Review.Mission && Button(new Rect(843, 514, 377, 33), "atlas-play", "Open Floodwatch mission")) Go(Page.Mission);
                }
                else Text(843, 439, 379, 72, "Reference map level. No contracts at this scale.", body, Muted);
                if (Button(new Rect(843, 575, 377, 38), "atlas-import", "Import browser progress")) mapImports = true;
            }
            Text(34, 646, 1180, 25, "Campaign links describe prerequisites. The Flight Plan tab shows the calculated trajectory.", small, Muted);
            if (mapLevel == 0) CameraInput(WideViewport);
        }

        bool Completed(string id) => (profile.completed && id == Review.Mission) || profile.browserCompleted.Contains(id);

        void DrawSchematic()
        {
            string[] names = mapLevel == 1 ? new[] { "SUN", "EARTH", "MARS", "JUPITER", "NEPTUNE", "HELIOPAUSE" }
                : mapLevel == 2 ? new[] { "SOL", "PROXIMA CENTAURI" } : new[] { "GALACTIC CENTRE", "LOCAL NEIGHBOURHOOD" };
            float gap = 632f / (names.Length - 1);
            PlotLine(new Vector2(95, 408), new Vector2(727, 408), Border, 1);
            for (int i = 0; i < names.Length; i++)
            {
                float x = 95 + gap * i;
                Box(new Rect(x - 5, 403, 10, 10), i == 0 ? Orange : Mint);
                Text(Mathf.Clamp(x - 27, 52, 650), 424, 150, 46, names[i], small, Ink);
            }
            Text(51, 589, 735, 30, "SCHEMATIC   •   BODY SIZES AND DISTANCES USE SEPARATE DISPLAY SCALES", mono, Muted);
        }

        void DrawImport()
        {
            Text(843, 229, 371, 88, "Run Tools/Export-Browser-Save.js in the original game tab. Paste the downloaded JSON file path below.", body, Ink);
            importPath = GUI.TextField(new Rect(843, 321, 377, 34), importPath, 1000, field);
            if (Button(new Rect(843, 370, 377, 39), "read-export", "Import progress snapshot", true,
                !profileRecovery && !string.IsNullOrWhiteSpace(importPath)))
            {
                try
                {
                    string path = importPath.Trim().Trim('"');
                    var info = new FileInfo(path);
                    if (!info.Exists || info.Length > 2000000) throw new IOException("Choose a valid export file under 2 MB.");
                    string json = File.ReadAllText(path);
                    Profile migrated = BrowserMigration.Prepare(profile, campaign, json);
                    using var sha = System.Security.Cryptography.SHA256.Create();
                    string archive = BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(json))).Replace("-", "");
                    Persistence.Write(Persistence.PathFor("browser-import-" + archive.Substring(0, 16) + ".json"), json);
                    Persistence.Save("profile.json", migrated);
                    profile = migrated;
                    notice = "Browser export imported. See the migration summary.";
                }
                catch (Exception error) { notice = "Import failed. " + error.Message; }
            }
            Text(843, 430, 374, 128, profile.importNote ?? "Your original save stays in the browser. Unsupported records are retained in the local archive.", small, Muted);
            if (Button(new Rect(843, 575, 377, 38), "atlas-index", "Return to contract index")) mapImports = false;
        }

    }
}
