// Educational plain-English tooltips explaining why each part matters
export const PART_TOOLTIPS = {
  // Buses
  bus_micro: 'The lightest satellite frame, cheap but restricted to only 1 payload slot.',
  bus_small: 'A sturdy structural chassis supporting 2 payloads with balanced power draw.',
  bus_medium: 'Heavy-duty chassis providing 3 payload slots for advanced multi-sensor missions.',
  bus_large: 'Massive spacecraft bus with 4 slots, designed for deep space exploration.',

  // Solar Panels
  panel_s: 'Generates 60 W in sunlight to sustain light components and charge small batteries.',
  panel_m: 'Generates 150 W to power imaging instruments and high-frequency radio transmitters.',
  panel_l: 'Heavy 300 W array built to supply energy-hungry radar sensors and relay transponders.',

  // Batteries
  battery_s: 'Stores 100 Wh of reserve power so electronics stay on when Earth blocks the Sun.',
  battery_m: 'Stores 300 Wh of energy for longer eclipse periods and continuous operations.',
  battery_l: 'Heavy 800 Wh reserve providing power through lengthy high-altitude darkness.',

  // Comms
  comms_uhf: 'Lightweight, low-power radio suitable for small data packets close to Earth.',
  comms_s_band: 'Reliable workhorse transmitter sending 10 GB per contact hour.',
  comms_x_band: 'High-speed radio sending 60 GB per hour, ideal for large satellite imagery.',
  comms_ka_band: 'High-bandwidth dish for beaming huge data volumes across lunar distances.',

  // Computer
  computer_basic: 'Standard flight computer managing satellite tasks and up to 40 GB of daily data.',
  computer_advanced: 'Faster flight processor that crunches up to 120 GB of sensor data each day.',
  computer_rad_hard: 'Radiation-shielded computer preventing crashes from cosmic rays beyond LEO.',
  computer_rad_hardened: 'Radiation-shielded computer preventing crashes from cosmic rays beyond LEO.',

  // Pointing
  pointing_magnetorquers: 'Steers using Earth’s magnetic field, but only works in low orbits (LEO/SSO).',
  pointing_reaction_wheels: 'Internal spinning flywheels that rotate the satellite anywhere with fine accuracy.',
  pointing_star_tracker: 'High-precision star tracker enabling steady aiming for spectrometers and lasers.',

  // Fuel
  fuel_s: 'Provides 10 kg of thruster propellant for orbital adjustments and station-keeping.',
  fuel_m: 'Carries 25 kg of propellant needed for orbit insertion and multi-year missions.',
  fuel_l: 'Large 60 kg tank required for heavy lunar braking burns and long station life.',

  // Instruments
  magnetometer: 'Measures space magnetic fields at almost zero mass and power.',
  thermal_imager: 'Measures surface infrared heat to track temperatures and water distribution.',
  weather_imager: 'Captures wide-angle pictures of atmospheric cloud movements and storms.',
  optical_camera: 'High-resolution optical camera providing clear visible imagery of floods and terrain.',
  radar_imager: 'Pierces through rain and night clouds using radar, but demands heavy power and data.',
  spectrometer: 'Identifies mineral and chemical signatures by analyzing reflected light wavelengths.',
  laser_altimeter: 'Fires laser pulses to map topographical elevation of mountains and craters.',
  neutron_detector: 'Sniffs out hydrogen signatures to locate subsurface water ice deposits on the Moon.',
  transponder_s: 'Relay transponder receiving and retransmitting data for remote communities.',
  transponder_m: 'Higher-throughput transponder handling more simultaneous data channels.',
  transponder_l: 'High-power transponder delivering maximum communications bandwidth across regions.'
};

export function getUnlockLabel(unlockTag) {
  switch (unlockTag) {
    case 'start':
      return 'Unlocked at Start';
    case 'after_m1':
      return 'Unlocks after Mission 1';
    case 'after_m2':
      return 'Unlocks after Mission 2';
    case 'after_world1':
      return 'Unlocks after World 1';
    case 'after_w2m1':
      return 'Unlocks after World 2, Mission 1';
    default:
      return 'Locked';
  }
}
