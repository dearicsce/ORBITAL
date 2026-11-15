using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

namespace Orbital
{
    // The browser process owns the child surface and the reference UI.
    public sealed class EmbeddedInterface : IDisposable
    {
        // JsonUtility fills transport records.
#pragma warning disable 0649
        [Serializable] sealed class Message
        {
            public int protocol;
            public string type, commandId;
            public Payload payload;
        }
        [Serializable] sealed class Payload
        {
            public string scene, screen;
            public float x, y, width, height, clipX, clipY, clipWidth, clipHeight, dx, dyUp, delta;
            public float[] position, rotation;
            public float fov;
        }
#pragma warning restore 0649
        [Serializable] sealed class ThumbnailReply
        {
            public string type = "scene.thumbnail";
            public ThumbnailPayload payload;
        }
        [Serializable] sealed class ThumbnailPayload { public string png; }
        [Serializable] sealed class MeshReply
        {
            public string type = "spacecraft.ack";
            public MeshReplyPayload payload;
        }
        [Serializable] sealed class MeshReplyPayload { public string commandId; }
        public string Scene { get; private set; } = "none";
        public string Error { get; private set; }
        public Rect Viewport { get; private set; }
        public Rect Clip { get; private set; }
        public bool Ready { get; private set; }
        public string StartupFailure { get; private set; }
        public static bool HasPlayerWindow => PlayerWindow != IntPtr.Zero;
        delegate bool WindowVisitor(IntPtr window, IntPtr parameter);
        [DllImport("user32.dll")]
        static extern bool EnumWindows(WindowVisitor visitor, IntPtr parameter);
        [DllImport("user32.dll")]
        static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        static extern int GetClassName(IntPtr window, StringBuilder name, int length);
        static IntPtr PlayerWindow
        {
            get
            {
                using var player = Process.GetCurrentProcess();
                IntPtr visible = player.MainWindowHandle;
                if (visible != IntPtr.Zero) return visible;
                // MainWindowHandle excludes hidden windows. Unity can already have
                // created its parent surface before fullscreen/startup makes it visible.
                IntPtr found = IntPtr.Zero;
                EnumWindows((window, parameter) =>
                {
                    GetWindowThreadProcessId(window, out uint owner);
                    if (owner != (uint)player.Id) return true;
                    var name = new StringBuilder(256);
                    GetClassName(window, name, name.Capacity);
                    if (name.ToString() != "UnityWndClass") return true;
                    found = window;
                    return false;
                }, IntPtr.Zero);
                return found;
            }
        }
        readonly ConcurrentQueue<(string json, int size)> incoming = new ConcurrentQueue<(string, int)>();
        readonly BlockingCollection<string> replies = new BlockingCollection<string>(8);
        readonly object queueBudget = new object();
        int queuedBytes, queuedFrames;
        volatile string transportFailure;
        readonly NamedPipeServerStream pipe;
        readonly Process host;
        readonly double started = Time.unscaledTimeAsDouble;
        readonly CancellationTokenSource cancellation = new CancellationTokenSource();
        bool thumbnailRequested;
        double lastThumbnail;
        readonly System.Collections.Generic.List<double> frameDurations = new System.Collections.Generic.List<double>();
        double measurementSeconds;
        string measurementPath;
        string screen = "startup";
        int bridgeMessages;
        long bridgeBytes;
        double thumbnailMs;

        public EmbeddedInterface()
        {
            string executable = Path.Combine(Application.streamingAssetsPath, "EmbeddedUI", "Orbital.EmbeddedUI.exe");
            string webRoot = Path.Combine(Application.streamingAssetsPath, "WebUI");
            if (!File.Exists(executable) || !File.Exists(Path.Combine(webRoot, "index.html")))
                throw new FileNotFoundException("Package the embedded host and reference UI before enabling the compositor.");
            IntPtr window = PlayerWindow;
            if (window == IntPtr.Zero) throw new InvalidOperationException("The Windows player has no main window yet.");
            string pipeName = "orbital-ui-" + Guid.NewGuid().ToString("N");
            pipe = new NamedPipeServerStream(pipeName, PipeDirection.InOut, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
            Directory.CreateDirectory(Persistence.Folder);
            if (Environment.GetEnvironmentVariable("ORBITAL_VERIFY_METRICS") == "1")
            {
                measurementPath = Path.Combine(Persistence.Folder, "embedded-performance-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss") + ".csv");
                File.WriteAllText(measurementPath, "utc,scene,screen,frames,seconds,mean_frame_ms,p95_frame_ms,p99_frame_ms,max_frame_ms,bridge_messages,bridge_bytes,thumbnail_ms,meshes,nodes\n");
            }
            string profile = Path.Combine(Persistence.Folder, "WebUI");
            string log = Path.Combine(Persistence.Folder, "embedded-ui.log");
            Task.Run(() => Receive());
            try
            {
                host = Process.Start(new ProcessStartInfo
                {
                    FileName = executable, UseShellExecute = false, CreateNoWindow = true,
                    Arguments = window.ToInt64() + " " + Quote(webRoot) + " " + Quote(profile) + " " + Quote(pipeName) + " " + Quote(log)
                });
            }
            catch { Dispose(); throw; }
        }

        static string Quote(string value) => "\"" + value.Replace("\"", "") + "\"";

        void Receive()
        {
            try
            {
                pipe.WaitForConnection();
                Task.Run(WriteReplies);
                while (!cancellation.IsCancellationRequested)
                {
                    int size = PresentationFrames.ReadLength(pipe, PresentationFrames.MaxFrame);
                    if (size == 0) throw new EndOfStreamException("The interface connection closed.");
                    lock (queueBudget)
                    {
                        while (queuedBytes + size > PresentationFrames.MaxQueuedBytes || queuedFrames >= PresentationFrames.MaxQueuedFrames)
                        {
                            if (cancellation.IsCancellationRequested) return;
                            Monitor.Wait(queueBudget);
                        }
                        queuedBytes += size;
                        queuedFrames++;
                    }
                    incoming.Enqueue((PresentationFrames.ReadBody(pipe, size), size));
                }
            }
            catch (Exception error)
            {
                if (!cancellation.IsCancellationRequested) transportFailure = error.Message;
            }
        }

        void WriteReplies()
        {
            try
            {
                foreach (string json in replies.GetConsumingEnumerable(cancellation.Token))
                    PresentationFrames.Write(pipe, json, PresentationFrames.Size(json));
            }
            catch (Exception error)
            {
                if (!cancellation.IsCancellationRequested) transportFailure = error.Message;
            }
        }

        public void Update(OrbitalView view)
        {
            MeasureFrame(view);
            if (host.HasExited || transportFailure != null)
            {
                StartupFailure = (transportFailure ?? "The interface host closed.") + " Restart ORBITAL to recover the saved session. See embedded-ui.log in the profile directory.";
                return;
            }
            long start = Stopwatch.GetTimestamp();
            for (int count = 0; count < 64 && (count == 0 || Stopwatch.GetTimestamp() - start < Stopwatch.Frequency * .004)
                && incoming.TryDequeue(out var frame); count++)
            {
                lock (queueBudget)
                {
                    queuedBytes -= frame.size;
                    queuedFrames--;
                    Monitor.Pulse(queueBudget);
                }
                string json = frame.json;
                bridgeMessages++;
                bridgeBytes += frame.size;
                try
                {
                    var message = JsonUtility.FromJson<Message>(json);
                    if (message?.protocol != 1 || message.type == null) continue;
                    var p = message.payload;
                    switch (message.type)
                    {
                        case "host.ready": Ready = true; break;
                        case "application.quit": Application.Quit(); break;
                        case "scene.camera":
                            if (p != null) view.SetReferenceCamera(p.position, p.rotation, p.fov);
                            break;
                        case "scene.thumbnail.request": thumbnailRequested = true; break;
                        case "viewport":
                            if (p == null || !Finite(p.x, p.y, p.width, p.height, p.clipX, p.clipY, p.clipWidth, p.clipHeight)) break;
                            if (p.scene != "earth" && p.scene != "spacecraft" && p.scene != "none") break;
                            if (p.scene != Scene)
                            {
                                view.ResetFraming();
                                if (Scene == "spacecraft") view.ClearReferenceCraft();
                            }
                            Scene = p.scene;
                            if (!string.IsNullOrEmpty(p.screen)) screen = p.screen;
                            Viewport = new Rect(p.x, p.y, Mathf.Clamp(p.width, 0, Screen.width * 4), Mathf.Clamp(p.height, 0, Screen.height * 4));
                            Clip = new Rect(p.clipX, p.clipY, p.clipWidth, p.clipHeight);
                            break;
                        case "camera.drag":
                            if (p != null && Finite(p.dx, p.dyUp)) view.ApplyOrbitDrag(p.dx, p.dyUp);
                            break;
                        case "camera.zoom":
                            if (p != null && Finite(p.delta)) view.zoom = Mathf.Clamp(view.zoom + p.delta * .001f, .4f, 2.5f);
                            break;
                        case "spacecraft.reset": view.ClearReferenceCraft(); break;
                        case "spacecraft.meshes":
                            view.SetReferenceMeshes(json);
                            if (!replies.TryAdd(JsonUtility.ToJson(new MeshReply { payload = new MeshReplyPayload { commandId = message.commandId } })))
                                throw new IOException("The mesh acknowledgment queue is full.");
                            break;
                    }
                }
                catch (Exception error)
                {
                    Error = "Embedded presentation message rejected. " + error.Message;
                    if (json.Contains("\"spacecraft.meshes\"")) transportFailure = Error;
                }
            }
            if (!Ready && Time.unscaledTimeAsDouble - started >= 30 && StartupFailure == null)
                StartupFailure = "Mission control did not load within 30 seconds. See embedded-ui.log in the profile directory.";
        }

        void MeasureFrame(OrbitalView view)
        {
            if (measurementPath == null) return;
            double seconds = Time.unscaledDeltaTime;
            measurementSeconds += seconds;
            frameDurations.Add(seconds * 1000);
            if (measurementSeconds < 2) return;
            frameDurations.Sort();
            int count = frameDurations.Count;
            double p95 = frameDurations[(int)Math.Ceiling(count * .95) - 1];
            double p99 = frameDurations[(int)Math.Ceiling(count * .99) - 1];
            File.AppendAllText(measurementPath, FormattableString.Invariant(
                $"{DateTime.UtcNow:O},{Scene},{screen},{count},{measurementSeconds:R},{measurementSeconds * 1000 / count:R},{p95:R},{p99:R},{frameDurations[count - 1]:R},{bridgeMessages},{bridgeBytes},{thumbnailMs:R},{view.ReferenceMeshCount},{view.ReferenceNodeCount}\n"));
            frameDurations.Clear();
            measurementSeconds = 0;
            bridgeMessages = 0;
            bridgeBytes = 0;
            thumbnailMs = 0;
        }

        static bool Finite(params float[] values)
        {
            foreach (float value in values) if (!float.IsFinite(value)) return false;
            return true;
        }

        public void FlushThumbnail(OrbitalView view)
        {
            if (!thumbnailRequested || (Scene != "spacecraft" && Scene != "earth") || replies.Count != 0 || Time.unscaledTimeAsDouble - lastThumbnail < .5) return;
            thumbnailRequested = false;
            lastThumbnail = Time.unscaledTimeAsDouble;
            long start = Stopwatch.GetTimestamp();
            string png = view.ReferenceThumbnail();
            thumbnailMs += (Stopwatch.GetTimestamp() - start) * 1000d / Stopwatch.Frequency;
            if (png != null) replies.TryAdd(JsonUtility.ToJson(new ThumbnailReply { payload = new ThumbnailPayload { png = png } }));
        }

        public void Dispose()
        {
            cancellation.Cancel();
            lock (queueBudget) Monitor.PulseAll(queueBudget);
            pipe?.Dispose();
            if (host != null && !host.HasExited)
            {
                host.CloseMainWindow();
                if (!host.WaitForExit(1000)) host.Kill();
            }
            host?.Dispose();
        }
    }
}
