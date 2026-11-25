using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("Hand Design for Chromium Setup")]
[assembly: AssemblyProduct("Hand Design")]
[assembly: AssemblyCompany("Hand Design")]
[assembly: AssemblyDescription("Hand Design for Chromium Setup")]
[assembly: AssemblyVersion(Setup.Version)]
[assembly: AssemblyFileVersion(Setup.Version)]
[assembly: AssemblyInformationalVersion(Setup.Version)]

static partial class Setup
{
    [STAThread]
    static void Main()
    {
        try
        {
            string dest = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HandDesign", "Chromium-Setup");
            try { if (Directory.Exists(dest)) Directory.Delete(dest, true); }
            catch (IOException) { dest += "-" + DateTime.Now.Ticks; }
            catch (UnauthorizedAccessException) { dest += "-" + DateTime.Now.Ticks; }
            Directory.CreateDirectory(dest);
            using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
            using (ZipArchive zip = new ZipArchive(s))
                zip.ExtractToDirectory(dest);

            string script = Path.Combine(dest, "files", "installer.ps1");

            ProcessStartInfo psi = new ProcessStartInfo("powershell.exe",
                "-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File \"" + script + "\" -Gui");
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WorkingDirectory = dest;
            Process.Start(psi);
        }
        catch (Exception e)
        {
            MessageBox.Show("Не получилось запустить установщик Hand Design.\n\n" + e.Message, "Hand Design", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
