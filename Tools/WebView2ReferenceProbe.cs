using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

// Verification host for the unmodified reference. It is not part of the game.
static class WebView2ReferenceProbe
{
    const string Origin = "https://orbital-reference.example/";

    [STAThread]
    static int Main(string[] args)
    {
        if (args.Length < 2) return 2;
        string root = Path.GetFullPath(args[0]), output = Path.GetFullPath(args[1]);
        string fixedRuntime = args.Length == 3 ? Path.GetFullPath(args[2]) : null;
        Directory.CreateDirectory(output);
        var log = new List<string>();
        bool passed = false;
        Application.EnableVisualStyles();
        using (var window = new Form { Text = "ORBITAL WebView2 reference probe", ClientSize = new Size(1366, 768) })
        using (var browser = new WebView2 { Dock = DockStyle.Fill })
        {
            window.Controls.Add(browser);
            window.Shown += async (sender, e) =>
            {
                try
                {
                    string profile = Path.Combine(Path.GetTempPath(), "orbital-webview2-" + Guid.NewGuid().ToString("N"));
                    var environment = await CoreWebView2Environment.CreateAsync(fixedRuntime, profile);
                    await browser.EnsureCoreWebView2Async(environment);
                    var view = browser.CoreWebView2;
                    log.Add("Runtime " + environment.BrowserVersionString);
                    log.Add("Profile " + profile);
                    view.Settings.AreBrowserAcceleratorKeysEnabled = false;
                    view.Settings.AreDefaultContextMenusEnabled = false;
                    view.Settings.AreDevToolsEnabled = false;
                    view.SetVirtualHostNameToFolderMapping(new Uri(Origin).Host, root, CoreWebView2HostResourceAccessKind.Deny);
                    view.NavigationStarting += (s, nav) => nav.Cancel = !nav.Uri.StartsWith(Origin, StringComparison.Ordinal);
                    view.NewWindowRequested += (s, popup) => popup.Handled = true;
                    view.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All, CoreWebView2WebResourceRequestSourceKinds.All);
                    view.WebResourceRequested += (s, request) =>
                    {
                        string uri = request.Request.Uri;
                        if (uri.StartsWith(Origin, StringComparison.Ordinal) || uri.StartsWith("blob:" + Origin, StringComparison.Ordinal))
                            return;
                        log.Add("Blocked " + uri);
                        request.Response = environment.CreateWebResourceResponse(null, 403, "Offline probe", "");
                    };
                    view.Navigate(Origin + "index.html");
                    await Wait(view, "Boolean(document.querySelector('#campaign'))");
                    await Capture(view, output, "home");
                    await Click(view, "#campaign");
                    await Click(view, "[data-map-mission=m1]");
                    await Capture(view, output, "campaign");
                    await Click(view, "#map-build");
                    await Click(view, "[data-category=bus]");
                    await Click(view, "[data-add=bus_small]");
                    await view.ExecuteScriptAsync("document.querySelector('#ws-dialog [data-choice]')?.click()");
                    await Click(view, "#ws-save");
                    await Wait(view, "document.querySelector('#ws-notice')?.textContent === 'Satellite saved.'");
                    string draft = await ReadDraft(view);
                    if (!draft.Contains("bus_small")) throw new InvalidOperationException("The installed bus was absent from the saved draft.");
                    await Capture(view, output, "workshop");
                    view.Reload();
                    await Task.Delay(500);
                    await Wait(view, "Boolean(document.querySelector('#ws-view canvas'))");
                    if (draft != await ReadDraft(view)) throw new InvalidOperationException("Draft changed after reload.");
                    log.Add("PASS: local ES modules, campaign route, bus installation, save and reload.");
                    passed = true;
                }
                catch (Exception error)
                {
                    log.Add(error.ToString());
                }
                finally
                {
                    File.WriteAllLines(Path.Combine(output, "probe.log"), log);
                    window.Close();
                }
            };
            Application.Run(window);
        }
        return passed ? 0 : 1;
    }

    static async Task Wait(CoreWebView2 view, string predicate)
    {
        DateTime deadline = DateTime.UtcNow.AddSeconds(30);
        while (DateTime.UtcNow < deadline)
        {
            if (await view.ExecuteScriptAsync(predicate) == "true") return;
            await Task.Delay(150);
        }
        throw new TimeoutException(predicate);
    }

    static async Task Click(CoreWebView2 view, string selector)
    {
        string element = "document.querySelector('" + selector + "')";
        await Wait(view, "Boolean(" + element + " && !" + element + ".disabled)");
        await view.ExecuteScriptAsync(element + ".click()");
    }

    static Task<string> ReadDraft(CoreWebView2 view)
    {
        return view.ExecuteScriptAsync("Object.keys(localStorage).filter(k => k.includes('draft')).map(k => localStorage.getItem(k))");
    }

    static async Task Capture(CoreWebView2 view, string output, string label)
    {
        using (var file = File.Create(Path.Combine(output, label + ".png")))
            await view.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, file);
    }
}
