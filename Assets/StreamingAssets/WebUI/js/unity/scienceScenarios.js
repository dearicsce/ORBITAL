export const SCIENCE_VERSION = 'mission-evidence-1';
export const OBSERVE_PLANS = {
  balanced: 'Use both encounter windows',
  priority: 'Give the primary target more integration time'
};

const ops = (instrument, product, question, user, windows, options = {}) =>
  ({instrument, product, question, user, windows, ...options});
const transfer = (instrument, product, question, user, hours, primaryShare, targets) =>
  ({instrument, product, question, user, hours, primaryShare, targets});
const optical = 'optical_camera', thermal = 'thermal_imager', weather = 'weather_imager';
const field = 'magnetometer', relay = 'transponder_s', spectra = 'spectrometer';

// Operations windows are [label, first tick, end tick). They are authored
// opportunities, independent of the actual light and Earth contact geometry.
export const SCENARIOS = {
  m1: ops(optical, 'Regional image brief', 'Can responders receive a detailed regional observation before the briefing?',
    'Flood response desk', [['Response region', 0, 78]], {sun: true, deadline: 110, minimum: 9}),
  wildfire: ops(thermal, 'Matched thermal revisit pair', 'Can the fire desk compare two thermal samples of the same synthetic scene?',
    'Fire monitoring desk', [['Basin · first look', 4, 42], ['Basin · revisit', 49, 93]], {minimum: 9, efficiency: .8}),
  ocean: ops(weather, 'Three-sector cloud-band sample', 'Can a broad imager sample cloud bands over several ocean sectors?',
    'Marine forecasters', [['West sector', 1, 33], ['Central sector', 34, 64], ['East sector', 65, 95]], {minimum: 9}),
  ice: ops(optical, 'Comparable daylight revisit pair', 'Can analysts compare the same synthetic ice edge under two daylight looks?',
    'Cryosphere analysts', [['Ice edge · initial daylight look', 7, 45], ['Ice edge · repeat daylight look', 52, 102]], {sun: true, minimum: 9, efficiency: .8}),
  m2: ops(relay, 'Emergency traffic service record', 'Can the relay serve dispatch at both scheduled check-ins?',
    'Island emergency dispatch', [['Morning dispatch', 0, 30], ['Shift change', 66, 101]], {minimum: 4}),
  storm: ops(weather, 'Storm approach sequence', 'Can forecasters receive observations before and during the synthetic storm approach?',
    'Coastal forecasters', [['Approach', 0, 23], ['Arrival', 38, 86]], {deadline: 112, minimum: 9}),
  night: ops(thermal, 'Dark-side thermal strip', 'Can the payload sample a synthetic nighttime thermal strip using stored energy?',
    'Night weather team', [['Night strip A', 0, 57], ['Night strip B', 57, 113]], {dark: true, minimum: 4}),
  solar: ops(field, 'Magnetic field watch sequence', 'Can a magnetometer retain comparable field samples across the disturbance watch?',
    'Space weather desk', [['Pre-event field', 0, 38], ['Disturbance watch', 54, 104]], {minimum: 9, efficiency: .8}),
  m3: ops(spectra, 'Lunar reflectance pair', 'Can spectroscopy compare two illuminated lunar units?',
    'Lunar geology team', [['Highland unit', 3, 47], ['Mare unit', 54, 96]], {sun: true, minimum: 7}),
  mapping: ops('laser_altimeter', 'Lunar elevation transects', 'Can the active altimeter sample three lunar transects across light and shadow?',
    'Lunar landing planners', [['Rim', 0, 24], ['Interior', 29, 62], ['Outlet', 69, 98]], {minimum: 9}),
  relay: ops(relay, 'Lunar field check-in service record', 'Can both surface crew shifts reach Earth during their check-in intervals?',
    'Simulated lunar field crew', [['Traverse departure', 4, 49], ['Return check-in', 57, 106]], {minimum: 4}),
  observatory: ops(spectra, 'Source and reference spectra', 'Can the observatory integrate both a synthetic source and a reference spectrum?',
    'Observatory science team', [['Reference star', 0, 18], ['Science source', 35, 83]], {minimum: 13.5}),
  'lunar-pathfinder': transfer(optical, 'Flyby context and close approach images', 'Can one flyby return context and close approach images?', 'Lunar reconnaissance team', 1.8, .53, ['Approach context', 'Nearside close approach']),
  'lunar-capture': transfer(optical, 'Post-capture image pair', 'Can a captured spacecraft return a survey and a second targeted look?', 'Lunar orbit planning team', 3, .48, ['Insertion survey', 'Follow-up target']),
  'venus-clouds': transfer(optical, 'Visible cloud morphology pair', 'Can two brief images describe synthetic bright cloud structures?', 'Venus atmosphere team', 1.3, .56, ['Cloud deck context', 'Bright cloud structures']),
  'mars-scout': transfer(optical, 'Mars approach and terrain context pair', 'Can an encounter return regional context before the radio window ends?', 'Mars reconnaissance team', 1.8, .50, ['Regional context', 'Crater approach']),
  'mars-orbiter': transfer(optical, 'Captured-orbit repeat imagery', 'Can a captured orbiter integrate a second look at the selected terrain?', 'Mars mapping team', 3.2, .46, ['Terrain reference', 'Repeat look']),
  'ceres-rendezvous': transfer(optical, 'Matched-velocity imaging pair', 'After matching velocity, can the probe image both synthetic target units?', 'Small-body geology team', 2.7, .47, ['Crater floor', 'Crater rim']),
  'comet-pass': transfer(optical, 'Coma and nucleus context pair', 'Can the short perihelion encounter sample both the coma and nucleus context?', 'Comet activity team', 1.6, .57, ['Coma context', 'Nucleus approach']),
  'jupiter-scout': transfer(optical, 'Cloud belt and storm context pair', 'Can an outer-planet flyby power two cloud looks and return both?', 'Giant-planet weather team', 1.9, .55, ['Cloud belt', 'Storm context']),
  'jupiter-orbiter': transfer(optical, 'Post-capture Jovian cloud sequence', 'Can a heavy capture stack deliver two views across the first observing sequence?', 'Jovian dynamics team', 2.8, .51, ['Cloud reference', 'Follow-up sector']),
  'europa-scout': transfer(optical, 'Europa ridge context pair', 'Can the brief encounter image a ridge and its surrounding terrain?', 'Icy moon reconnaissance team', 1.7, .54, ['Ridge', 'Surrounding terrain']),
  'saturn-scout': transfer(optical, 'Ring and globe context pair', 'Can both ring and globe context reach Earth on the available link?', 'Ring dynamics team', 2.1, .60, ['Ring sector', 'Globe context']),
  'uranus-scout': transfer(optical, 'Uranus disk and limb pair', 'Does the cruise system last long enough to image both the disk and limb?', 'Ice giant reconnaissance team', 2.3, .52, ['Disk', 'Limb']),
  'neptune-scout': transfer(optical, 'Neptune cloud and disk pair', 'Can a weak distant link deliver both priority clouds and disk context?', 'Ice giant weather team', 2.4, .64, ['Cloud context', 'Disk reference']),
  'heliopause-crossing': transfer(field, 'Before/after magnetic field record', 'Can a magnetometer return samples from both sides of the authored boundary?', 'Heliophysics boundary team', 3.6, .50, ['Inside boundary', 'Outside boundary']),
  'interstellar-precursor': transfer(field, 'Far-field and reference record', 'Can a long-lived probe return a field baseline and a far-field sample?', 'Interstellar precursor team', 3.0, .42, ['Reference field', 'Far-field sample']),
  'proxima-sail': transfer(optical, 'Speculative approach and encounter images', 'Under the assumed sail speed, lifetime and optical receiver, when could two images arrive?', 'Future stellar probe concept team', 2.2, .58, ['Approach context', 'Encounter context'])
};
