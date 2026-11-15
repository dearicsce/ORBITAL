using System;

namespace Orbital
{
    public enum Subsystem { Imager, Downlink, BatteryGuard }
    public enum CommandStatus { Queued, Uplink, Executed, Confirmed }

    [Serializable]
    public sealed class FlightCommand
    {
        public Subsystem subsystem;
        public CommandStatus status;
        public bool enabled;
        public double requested, sent, received, executed, confirmed;
        public string Description => $"{subsystem} {(enabled ? "on" : "off")}";
    }

    public static class Replay
    {
        public static Flight Alternate(Flight original, bool suppressFirstImagerRequest)
        {
            if (!original.State.finished || original.State.operations == null)
                throw new InvalidOperationException("Replay requires a finished orbital flight.");
            var branch = new Flight(original.Review, original.State.snapshot);
            branch.State.seed = original.State.seed;
            var commands = original.State.commands;
            int index = 0;
            bool inserted = false, skipped = false;
            while (!branch.State.finished)
            {
                if (!inserted && branch.State.operations != null)
                {
                    inserted = true;
                    if (!suppressFirstImagerRequest) branch.Queue(Subsystem.Imager, false);
                }
                while (branch.State.operations != null && index < commands.Count && commands[index].requested <= branch.Clock)
                {
                    var command = commands[index++];
                    if (suppressFirstImagerRequest && !skipped && command.subsystem == Subsystem.Imager)
                    {
                        skipped = true;
                        continue;
                    }
                    branch.Queue(command.subsystem, command.enabled);
                }
                branch.Advance();
            }
            return branch;
        }
    }
}
