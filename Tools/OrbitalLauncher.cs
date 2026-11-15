using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class OrbitalLauncher
{
    [STAThread]
    static void Main()
    {
        string player = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Build-Current", "ORBITAL.exe");
        try
        {
            if (!File.Exists(player)) throw new FileNotFoundException("Keep the Build-Current folder beside Orbital.exe. Rebuild the player if that folder is missing.");
            var start = new ProcessStartInfo(player) { UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(player) };
            string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ORBITAL", "Current", "Profile");
            start.EnvironmentVariables["ORBITAL_PROFILE_DIR"] = profile;
            start.EnvironmentVariables["ORBITAL_EXPORT_DIR"] = Path.Combine(profile, "Exports");
            start.EnvironmentVariables["ORBITAL_WEB_UI"] = "1";
            Process.Start(start);
        }
        catch (Exception error)
        {
            MessageBox.Show(error.Message, "ORBITAL could not start", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
