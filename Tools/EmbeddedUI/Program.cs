using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;

namespace Orbital.EmbeddedUI
{
    static class Program
    {
        [STAThread]
        static int Main(string[] args)
        {
            if (args.Length != 5) return 2;
            Native.SetProcessDpiAwarenessContext(new IntPtr(-4));
            Application.EnableVisualStyles();
            using (var host = new BrowserHost(new IntPtr(long.Parse(args[0])), args[1], args[2], args[3], args[4]))
                Application.Run(host);
            return 0;
        }
    }

    sealed class BrowserHost : Form
    {
        const string Origin = "https://orbital.local/";
        readonly IntPtr parent;
        readonly string root, profile, pipeName, logPath;
        readonly Timer timer = new Timer { Interval = 40 };
        NamedPipeClientStream pipe;
        readonly BlockingCollection<Tuple<string, int>> outgoing = new BlockingCollection<Tuple<string, int>>(PresentationFrames.MaxQueuedFrames);
        readonly object queueBudget = new object();
        int queuedBytes;
        CoreWebView2CompositionController compositionController;
        CoreWebView2Controller controller;
        Composition composition;
        bool ready, closing;

        public BrowserHost(IntPtr parent, string root, string profile, string pipeName, string logPath)
        {
            this.parent = parent;
            this.root = Path.GetFullPath(root);
            this.profile = Path.GetFullPath(profile);
            this.pipeName = pipeName;
            this.logPath = logPath;
            FormBorderStyle = FormBorderStyle.None;
            TopLevel = false;
            ShowInTaskbar = false;
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint, true);
            timer.Tick += delegate { FitParent(); };
            Shown += async delegate { await Initialize(); };
        }

        protected override CreateParams CreateParams
        {
            get
            {
                var parameters = base.CreateParams;
                parameters.Parent = parent;
                parameters.Style = unchecked((int)0x50000000); // WS_CHILD | WS_VISIBLE
                parameters.ExStyle = 0x00200000; // WS_EX_NOREDIRECTIONBITMAP
                return parameters;
            }
        }

        protected override void OnPaintBackground(PaintEventArgs e) { }
        protected override void OnPaint(PaintEventArgs e) { }

        void Log(string message)
        {
            File.AppendAllText(logPath, DateTime.UtcNow.ToString("O") + " " + message + Environment.NewLine);
        }

        async Task Initialize()
        {
            try
            {
                pipe = new NamedPipeClientStream(".", pipeName, PipeDirection.InOut, PipeOptions.Asynchronous);
                await pipe.ConnectAsync(15000);
                Task.Run((Action)WriteMessages);
                Native.SetParent(Handle, parent);
                Native.ShowWindow(Handle, 5);
                FitParent();
                composition = new Composition(Handle);
                string fixedRuntime = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Runtime");
                var environment = await CoreWebView2Environment.CreateAsync(
                    Directory.Exists(fixedRuntime) ? fixedRuntime : null, profile);
                compositionController = await environment.CreateCoreWebView2CompositionControllerAsync(Handle);
                controller = (CoreWebView2Controller)compositionController;
                controller.DefaultBackgroundColor = Color.Transparent;
                controller.ShouldDetectMonitorScaleChanges = false;
                controller.RasterizationScale = 1;
                controller.Bounds = ClientRectangle;
                controller.IsVisible = true;
                compositionController.RootVisualTarget = composition.Root;
                composition.Commit();
                var web = controller.CoreWebView2;
                // Refresh only HTTP assets when the owned package changes.
                // LocalStorage, campaign progress, cookies and user designs are
                // deliberately excluded from this cache invalidation.
                string manifestPath = Path.Combine(root, "dependency-manifest.json");
                if (File.Exists(manifestPath))
                {
                    string packageHash;
                    using (var hash = SHA256.Create())
                        packageHash = BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(manifestPath))).Replace("-", "").ToLowerInvariant();
                    string marker = Path.Combine(profile, "orbital-package-sha256.txt");
                    if (!File.Exists(marker) || File.ReadAllText(marker) != packageHash)
                    {
                        await web.Profile.ClearBrowsingDataAsync(CoreWebView2BrowsingDataKinds.DiskCache);
                        File.WriteAllText(marker, packageHash);
                        Log("Package cache refreshed " + packageHash + "; persistent saves retained.");
                    }
                }
                web.Settings.AreDefaultContextMenusEnabled = false;
                web.Settings.AreBrowserAcceleratorKeysEnabled = false;
                web.Settings.IsStatusBarEnabled = false;
                web.SetVirtualHostNameToFolderMapping("orbital.local", root, CoreWebView2HostResourceAccessKind.Deny);
                web.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs e)
                {
                    e.Cancel = !e.Uri.StartsWith(Origin, StringComparison.Ordinal);
                };
                web.NewWindowRequested += OpenSource;
                web.DownloadStarting += SaveDownload;
                web.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All, CoreWebView2WebResourceRequestSourceKinds.All);
                web.WebResourceRequested += delegate(object sender, CoreWebView2WebResourceRequestedEventArgs e)
                {
                    string uri = e.Request.Uri;
                    if (uri.StartsWith(Origin, StringComparison.Ordinal) || uri.StartsWith("blob:" + Origin, StringComparison.Ordinal) || uri.StartsWith("data:", StringComparison.Ordinal)) return;
                    e.Response = environment.CreateWebResourceResponse(null, 403, "Offline content only", "");
                    Log("Blocked external resource " + uri);
                };
                web.WebMessageReceived += delegate(object sender, CoreWebView2WebMessageReceivedEventArgs e)
                {
                    if (e.Source.StartsWith(Origin, StringComparison.Ordinal))
                    {
                        string json = e.WebMessageAsJson;
                        QueueMessage(json);
                        if (json.Contains("host.ready")) Log("Presentation bridge ready");
                    }
                };
                web.NavigationCompleted += async delegate(object sender, CoreWebView2NavigationCompletedEventArgs e)
                {
                    Log("Navigation completed " + e.IsSuccess + " " + e.WebErrorStatus + " " + ClientRectangle);
                    Log(await web.ExecuteScriptAsync("document.body.innerText.slice(0,300)"));
                };
                compositionController.CursorChanged += delegate { Native.SetCursor(compositionController.Cursor); };
                controller.AcceleratorKeyPressed += delegate(object sender, CoreWebView2AcceleratorKeyPressedEventArgs e)
                {
                    bool alt = Native.GetKeyState(18) < 0;
                    if (e.VirtualKey == 122 || e.VirtualKey == 13 && alt)
                    {
                        e.Handled = true;
                        Native.PostMessage(parent, 0x0100, new IntPtr(122), IntPtr.Zero);
                    }
                    if (e.VirtualKey == 115 && alt)
                    {
                        e.Handled = true;
                        QueueMessage("{\"protocol\":1,\"type\":\"application.quit\"}");
                    }
                };
                ready = true;
                web.Navigate(Origin + "index.html");
                timer.Start();
                Log("Composition host ready. WebView2 " + environment.BrowserVersionString + " parent=" + parent + " child=" + Handle
                    + " actualParent=" + Native.GetParent(Handle) + " visible=" + Native.IsWindowVisible(Handle));
                await ReadMessages();
            }
            catch (Exception error)
            {
                Log(error.ToString());
                Close();
            }
        }

        void OpenSource(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            e.Handled = true;
            Uri uri;
            if (!e.IsUserInitiated || !Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) ||
                uri.Scheme != Uri.UriSchemeHttps || !uri.IsDefaultPort || uri.UserInfo.Length != 0) return;
            switch (uri.Host)
            {
                case "science.nasa.gov":
                case "www.nasa.gov":
                case "api.nasa.gov":
                case "ssd.jpl.nasa.gov":
                case "pds-geosciences.wustl.edu":
                case "ode.rsl.wustl.edu":
                case "firms.modaps.eosdis.nasa.gov":
                case "nrt3.modaps.eosdis.nasa.gov":
                case "cmr.earthdata.nasa.gov":
                case "www.earthdata.nasa.gov":
                case "doi.org":
                case "eros.usgs.gov":
                    try { Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true }); }
                    catch (Exception error) { MessageBox.Show(this, error.Message, "Could not open source"); }
                    break;
            }
        }

        void SaveDownload(object sender, CoreWebView2DownloadStartingEventArgs e)
        {
            e.Handled = true;
            var operation = e.DownloadOperation;
            string name = Path.GetFileName(e.ResultFilePath);
            if (!operation.Uri.StartsWith("blob:" + Origin, StringComparison.Ordinal) ||
                !string.Equals(Path.GetExtension(name), ".json", StringComparison.OrdinalIgnoreCase))
            {
                e.Cancel = true;
                return;
            }
            string configuredDirectory = Environment.GetEnvironmentVariable("ORBITAL_EXPORT_DIR");
            if (!string.IsNullOrEmpty(configuredDirectory))
            {
                try
                {
                    if (!Path.IsPathRooted(configuredDirectory)) throw new IOException("The export directory must be absolute.");
                    // Chromium's download target requires a native absolute path,
                    // including when a verification caller supplies forward slashes.
                    configuredDirectory = Path.GetFullPath(configuredDirectory);
                    Directory.CreateDirectory(configuredDirectory);
                    string uniqueName = Path.GetFileNameWithoutExtension(name) + "-" + Guid.NewGuid().ToString("N") + ".json";
                    e.ResultFilePath = Path.Combine(configuredDirectory, uniqueName);
                    ObserveDownload(operation);
                }
                catch (Exception error) { e.Cancel = true; ShowExportStatus("Export failed. " + error.Message); }
                return;
            }
            var deferral = e.GetDeferral();
            BeginInvoke((Action)delegate
            {
                try
                {
                    using (var dialog = new SaveFileDialog { FileName = name, Filter = "ORBITAL JSON (*.json)|*.json", DefaultExt = "json", AddExtension = true })
                    {
                        if (dialog.ShowDialog(this) != DialogResult.OK) { e.Cancel = true; return; }
                        e.ResultFilePath = dialog.FileName;
                    }
                    ObserveDownload(operation);
                }
                catch (Exception error) { e.Cancel = true; ShowExportStatus("Export failed. " + error.Message); }
                finally { deferral.Complete(); }
            });
        }

        void ObserveDownload(CoreWebView2DownloadOperation operation)
        {
            operation.StateChanged += delegate
            {
                if (operation.State == CoreWebView2DownloadState.InProgress) return;
                ShowExportStatus(operation.State == CoreWebView2DownloadState.Completed
                    ? "Saved to " + operation.ResultFilePath
                    : "Export interrupted. " + operation.InterruptReason);
            };
        }

        void ShowExportStatus(string status)
        {
            Log(status);
            if (!closing) controller.CoreWebView2.PostWebMessageAsString("orbital-export:" + status);
        }

        void QueueMessage(string json)
        {
            if (closing || outgoing.IsAddingCompleted) return;
            int size = PresentationFrames.Size(json);
            lock (queueBudget)
            {
                if (size <= PresentationFrames.MaxFrame && queuedBytes + size <= PresentationFrames.MaxQueuedBytes &&
                    outgoing.TryAdd(Tuple.Create(json, size)))
                {
                    queuedBytes += size;
                    return;
                }
            }
            Log("Presentation transport capacity exceeded (" + size + " byte frame, " + queuedBytes + " bytes queued). Closing the host to recover the saved session.");
            Close();
        }

        void WriteMessages()
        {
            try
            {
                foreach (var frame in outgoing.GetConsumingEnumerable())
                {
                    PresentationFrames.Write(pipe, frame.Item1, frame.Item2);
                    lock (queueBudget) queuedBytes -= frame.Item2;
                }
            }
            catch (IOException) { if (!closing) BeginInvoke((Action)Close); }
            catch (ObjectDisposedException) { }
        }

        async Task ReadMessages()
        {
            while (!closing)
            {
                string message = await Task.Run(() =>
                {
                    int size = PresentationFrames.ReadLength(pipe, 1000000);
                    return size == 0 ? null : PresentationFrames.ReadBody(pipe, size);
                });
                if (closing) return;
                if (message == null) { Close(); return; }
                controller.CoreWebView2.PostWebMessageAsJson(message);
            }
        }

        void FitParent()
        {
            Native.Rect rect;
            if (!Native.IsWindow(parent)) { Close(); return; }
            if (!Native.GetClientRect(parent, out rect)) return;
            int width = rect.Right, height = rect.Bottom;
            if (width == 0 || height == 0) return;
            if (Width == width && Height == height) return;
            Native.SetWindowPos(Handle, IntPtr.Zero, 0, 0, width, height, 0x0040);
            if (controller != null)
            {
                controller.Bounds = new Rectangle(0, 0, width, height);
                controller.NotifyParentWindowPositionChanged();
            }
        }

        protected override void WndProc(ref Message message)
        {
            if (ready)
            {
                int kind = message.Msg;
                if (kind >= 0x0200 && kind <= 0x020E)
                {
                    long packed = message.LParam.ToInt64();
                    var point = new Point((short)(packed & 0xffff), (short)((packed >> 16) & 0xffff));
                    if (kind == 0x020A || kind == 0x020E) point = PointToClient(point);
                    uint keys = (uint)(message.WParam.ToInt64() & 0xffff);
                    uint data = kind == 0x020A || kind == 0x020E ? unchecked((uint)(short)(message.WParam.ToInt64() >> 16)) : 0;
                    if (kind == 0x0201 || kind == 0x0204 || kind == 0x0207)
                    {
                        Native.SetFocus(Handle);
                        Native.SetCapture(Handle);
                        controller.MoveFocus(CoreWebView2MoveFocusReason.Programmatic);
                    }
                    if (kind == 0x0202 || kind == 0x0205 || kind == 0x0208) Native.ReleaseCapture();
                    compositionController.SendMouseInput((CoreWebView2MouseEventKind)kind,
                        (CoreWebView2MouseEventVirtualKeys)keys, data, point);
                    return;
                }
                if (kind == 0x0020) { Native.SetCursor(compositionController.Cursor); message.Result = new IntPtr(1); return; }
            }
            base.WndProc(ref message);
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            closing = true;
            outgoing.CompleteAdding();
            timer.Stop();
            if (compositionController != null) compositionController.RootVisualTarget = null;
            if (controller != null) controller.Close();
            if (composition != null) composition.Dispose();
            if (pipe != null) pipe.Dispose();
            base.OnFormClosed(e);
        }
    }

    static class Native
    {
        [StructLayout(LayoutKind.Sequential)]
        internal struct Rect { public int Left, Top, Right, Bottom; }
        [DllImport("user32.dll")] internal static extern bool SetProcessDpiAwarenessContext(IntPtr context);
        [DllImport("user32.dll")] internal static extern bool IsWindow(IntPtr window);
        [DllImport("user32.dll")] internal static extern bool IsWindowVisible(IntPtr window);
        [DllImport("user32.dll")] internal static extern IntPtr GetParent(IntPtr window);
        [DllImport("user32.dll")] internal static extern IntPtr SetParent(IntPtr window, IntPtr parent);
        [DllImport("user32.dll")] internal static extern bool ShowWindow(IntPtr window, int command);
        [DllImport("user32.dll")] internal static extern bool GetClientRect(IntPtr window, out Rect rect);
        [DllImport("user32.dll")] internal static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int w, int h, uint flags);
        [DllImport("user32.dll")] internal static extern IntPtr SetFocus(IntPtr window);
        [DllImport("user32.dll")] internal static extern IntPtr SetCapture(IntPtr window);
        [DllImport("user32.dll")] internal static extern bool ReleaseCapture();
        [DllImport("user32.dll")] internal static extern IntPtr SetCursor(IntPtr cursor);
        [DllImport("user32.dll")] internal static extern short GetKeyState(int key);
        [DllImport("user32.dll")] internal static extern bool PostMessage(IntPtr window, uint message, IntPtr wparam, IntPtr lparam);
    }
}
