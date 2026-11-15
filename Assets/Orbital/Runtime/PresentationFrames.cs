using System;
using System.IO;
using System.Text;

namespace Orbital
{
    // Both ends run on Windows. A little-endian byte count precedes each UTF-8 frame.
    internal static class PresentationFrames
    {
        public const int MaxFrame = 24000000;
        public const int MaxQueuedBytes = 32000000;
        public const int MaxQueuedFrames = 96;
        static readonly Encoding Utf8 = new UTF8Encoding(false, true);

        public static int Size(string json) { return Utf8.GetByteCount(json); }

        public static int ReadLength(Stream stream, int limit)
        {
            var header = new byte[4];
            int first = stream.ReadByte();
            if (first < 0) return 0;
            header[0] = (byte)first;
            ReadExactly(stream, header, 1);
            int size = BitConverter.ToInt32(header, 0);
            if (size <= 0 || size > limit) throw new IOException("Invalid presentation frame length.");
            return size;
        }

        public static string ReadBody(Stream stream, int size)
        {
            var data = new byte[size];
            ReadExactly(stream, data, 0);
            return Utf8.GetString(data);
        }

        static void ReadExactly(Stream stream, byte[] data, int offset)
        {
            while (offset < data.Length)
            {
                int count = stream.Read(data, offset, data.Length - offset);
                if (count == 0) throw new EndOfStreamException("Incomplete presentation frame.");
                offset += count;
            }
        }

        public static void Write(Stream stream, string json, int size)
        {
            var header = BitConverter.GetBytes(size);
            stream.Write(header, 0, header.Length);
            var data = Utf8.GetBytes(json);
            stream.Write(data, 0, data.Length);
        }
    }
}
