using System;
using System.Runtime.InteropServices;

namespace Orbital.EmbeddedUI
{
    // These slots are the Windows SDK IDCompositionDevice and
    // IDCompositionTarget ABI. The visual is passed to WebView2 as IUnknown.
    sealed class Composition : IDisposable
    {
        IntPtr device, target, visual;
        public object Root { get; private set; }

        [DllImport("dcomp.dll")]
        static extern int DCompositionCreateDevice(IntPtr renderingDevice, ref Guid iid, out IntPtr device);

        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        delegate int CommitCall(IntPtr self);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        delegate int TargetCall(IntPtr self, IntPtr hwnd, int topmost, out IntPtr result);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        delegate int VisualCall(IntPtr self, out IntPtr result);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        delegate int RootCall(IntPtr self, IntPtr visual);

        static T Slot<T>(IntPtr instance, int slot) where T : class
        {
            IntPtr address = Marshal.ReadIntPtr(Marshal.ReadIntPtr(instance), slot * IntPtr.Size);
            return Marshal.GetDelegateForFunctionPointer(address, typeof(T)) as T;
        }

        public Composition(IntPtr window)
        {
            try
            {
                Guid iid = new Guid("C37EA93A-E7AA-450D-B16F-9746CB0407F3");
                Marshal.ThrowExceptionForHR(DCompositionCreateDevice(IntPtr.Zero, ref iid, out device));
                Marshal.ThrowExceptionForHR(Slot<TargetCall>(device, 6)(device, window, 1, out target));
                Marshal.ThrowExceptionForHR(Slot<VisualCall>(device, 7)(device, out visual));
                Marshal.ThrowExceptionForHR(Slot<RootCall>(target, 3)(target, visual));
                Root = Marshal.GetObjectForIUnknown(visual);
            }
            catch { Dispose(); throw; }
        }

        public void Commit()
        {
            Marshal.ThrowExceptionForHR(Slot<CommitCall>(device, 3)(device));
        }

        public void Dispose()
        {
            if (Root != null) { Marshal.ReleaseComObject(Root); Root = null; }
            if (visual != IntPtr.Zero) { Marshal.Release(visual); visual = IntPtr.Zero; }
            if (target != IntPtr.Zero) { Marshal.Release(target); target = IntPtr.Zero; }
            if (device != IntPtr.Zero) { Marshal.Release(device); device = IntPtr.Zero; }
        }
    }
}
