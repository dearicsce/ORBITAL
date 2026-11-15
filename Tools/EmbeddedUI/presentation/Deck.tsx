import React, { useState } from 'react';
import {
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useAdapter } from './useAdapter';

export const TitleAndDeckScreen: React.FC = () => {
  const { adapter, missionState } = useAdapter();
  const [showAboutNote, setShowAboutNote] = useState(false);
  React.useEffect(() => {
    const container = document.getElementById('earth-canvas-container');
    if (container && typeof adapter.mountScene === 'function') return adapter.mountScene('title', container);
  }, [adapter]);
  return <>
    <div id="earth-canvas-container" data-deck-viewport aria-hidden="true" />
    <section className="title-screen" aria-label="Title and Mission Deck">
      <header className="title-header">
        <span className="title-brand">ORBITAL<span>MISSION CONTROL</span></span>
        <nav aria-label="Game navigation">
          <button onClick={adapter.openHangar}>Hangar</button>
          <button onClick={adapter.openAcademy}>Flight Academy</button>
          <button onClick={adapter.openReference}>Reference</button>
          <button onClick={adapter.openSettings}>Settings</button>
        </nav>
      </header>
      <main className="title-content">
        <p className="title-kicker">A SPACE MISSION DESIGN GAME</p>
        <h1>ORBITAL</h1>
        <p className="title-intro">Build the spacecraft.<br/>Bring back the evidence.</p>
        <p className="title-description">Design, launch and operate missions from Earth orbit to the edge of the Solar System.</p>
        <div className="title-actions">
          <button
            type="button"
            className="title-continue"
            data-continue-campaign="true"
            onClick={adapter.continueCampaign}
          >
            <span>Continue Campaign</span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        {missionState.notice && <p className="title-notice" role="status">{missionState.notice}</p>}
      </main>
      <footer className="title-footer">
        <button onClick={()=>setShowAboutNote(true)}>About &amp; credits</button>
        <span>EARTH · HOME PORT</span>
      </footer>
      {showAboutNote && <div className="title-about-backdrop">
        <section className="title-about" role="dialog" aria-modal="true" aria-labelledby="title-about-heading"
          onKeyDown={event=>{if(event.key==='Escape')setShowAboutNote(false);}}>
          <button className="title-about-close" autoFocus onClick={()=>setShowAboutNote(false)}>Close</button>
          <h2 id="title-about-heading">About ORBITAL</h2>
          <p>Design a spacecraft, launch it and decide how to use its time, energy and communications.</p>
          <p>Catch the Next Dip uses archived NASA Kepler photometry. The spacecraft, ascent and downlink use educational simulation models.</p>
          <button onClick={adapter.openReference}>Browse observations and sources ↗</button>
        </section>
      </div>}
    </section>
  </>;
};

/* ============================================================================
   SCREEN 2: BRIEF AND PREDICTION
   SVG light-curve plot (dimmer drops lower on Y-axis), two equal-weight
   prediction tracks, and 3 candidate dates with NO default selections.
   ============================================================================ */
export const BriefAndPredictionScreen: React.FC = () => {
  const { adapter, missionState } = useAdapter();
  const samples = missionState.sharedEventPlot;

  const minFlux = Math.min(...samples.map(sample => sample.flux));
  const maxFlux = Math.max(...samples.map(sample => sample.flux));
  const fluxPadding = Math.max(.0001, (maxFlux - minFlux) * .1);
  const axisBottom = minFlux - fluxPadding;
  const axisTop = maxFlux + fluxPadding;
  const firstHour = samples[0].hourOffset;
  const lastHour = samples[samples.length - 1].hourOffset;
  const mapFluxToY = (flux: number) => 144 - 112 * (flux - axisBottom) / (axisTop - axisBottom);
  const mapIndexToX = (idx: number) => 64 + 452 * (samples[idx].hourOffset - firstHour) / (lastHour - firstHour);

  const polylinePoints = samples
    .map((pt, idx) => `${mapIndexToX(idx)},${mapFluxToY(pt.flux)}`)
    .join(' ');

  return (
    <section
      aria-label="Mission Brief and Ephemeris Prediction"
      className="mission-brief"
    >
      {/* Top Header Strip */}
      <header className="mission-brief__header">
        <div className="mission-brief__title-group">
          <div className="mission-brief__phase-tag">
            Phase 01 · Mission Briefing &amp; Ephemeris Prediction
          </div>
          <h1>Catch the Next Dip</h1>
          <div className="mission-brief__subtitle">
            Target KIC 11446443 · Kepler long-cadence photometry
          </div>
        </div>

        <div className="mission-brief__header-actions">
          <button
            type="button"
            onClick={() => adapter.toggleTimeSystemNote()}
            aria-expanded={missionState.showingTimeSystemNote}
            className="orbital-btn"
          >
            {missionState.showingTimeSystemNote ? 'Hide Time System Note' : 'Inspect Time System (BJD_TDB)'}
          </button>
          <button
            type="button"
            onClick={adapter.returnToTitle}
            className="orbital-btn"
          >
            Back to Deck
          </button>
        </div>
      </header>

      {/* Inspectable Time System Note */}
      {missionState.showingTimeSystemNote && (
        <div role="note" className="mission-brief__time-note">
          <div>
            <strong>ARCHIVE TIME vs. FLIGHT T+: </strong>
            Candidate transit windows use Barycentric Julian Date (BJD_TDB) expressed in friendly UTC archive dates
            and relative hours. Ascent flight clock (<span className="font-telemetry">T+00:00:00</span>) begins only at pad liftoff.
          </div>
          <span>Kepler Long-Cadence Archive</span>
        </div>
      )}

      {/* Main Two-Column Composition: Left Evidence Plot / Right Decisions */}
      <div className="mission-brief__body">
        {/* Left Column: Shared-Event Light-Curve SVG Plot */}
        <div className="mission-brief__evidence">
          <div className="mission-brief__evidence-header">
            <div>
              <div className="mission-brief__panel-eyebrow">
                Archive Reference
              </div>
              <h2>Observed Light Curve</h2>
            </div>
            <button
              type="button"
              onClick={() => adapter.toggleSharedEventExample()}
              className="orbital-btn"
              style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
            >
              {missionState.showingSharedExample ? 'Hide Guide Overlay' : 'Show Guide Overlay'}
            </button>
          </div>

          <p className="mission-brief__evidence-desc">
            A dimmer reading drops lower on the vertical axis. To separate two competing ephemeris models,
            capturing only the central dip is insufficient—you must also return a baseline shoulder reading.
          </p>

          {/* SVG Light Curve Plot */}
          <div className="mission-brief__plot-wrap">
            <svg
              viewBox="0 0 560 195"
              className="w-full h-auto"
              role="img"
              aria-label="Shared-event stellar light curve from the Kepler Q1 archive"
            >
              {/* Horizontal Reference Grid Lines */}
              <line x1="56" y1="32" x2="530" y2="32" stroke="var(--orbital-border)" strokeWidth="1" />
              <line x1="56" y1="88" x2="530" y2="88" stroke="var(--orbital-border)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="56" y1="144" x2="530" y2="144" stroke="var(--orbital-border)" strokeWidth="1" />

              {/* Y-Axis Labels (Tabular Flux) */}
              <text x="48" y="36" textAnchor="end" fill="var(--orbital-text)" fontSize="10" fontFamily="var(--font-telemetry)">
                {axisTop.toFixed(4)}
              </text>
              <text x="48" y="92" textAnchor="end" fill="var(--orbital-text-muted)" fontSize="10" fontFamily="var(--font-telemetry)">
                {((axisTop + axisBottom) / 2).toFixed(4)}
              </text>
              <text x="48" y="148" textAnchor="end" fill="var(--orbital-accent)" fontSize="10" fontFamily="var(--font-telemetry)">
                {axisBottom.toFixed(4)}
              </text>
              <text
                x="14"
                y="95"
                textAnchor="middle"
                fill="var(--orbital-text-dim)"
                fontSize="9"
                fontFamily="var(--font-telemetry)"
                transform="rotate(-90 14 95)"
              >
                FLUX (DIMMER ↓)
              </text>

              {/* Light-Curve Connected Line */}
              <polyline
                fill="none"
                stroke="var(--orbital-text)"
                strokeWidth="2"
                points={polylinePoints}
              />

              <text x="64" y="176" fill="var(--orbital-text-muted)" fontSize="10" fontFamily="var(--font-telemetry)">{firstHour.toFixed(1)} h</text>
              <text x="516" y="176" fill="var(--orbital-text-muted)" fontSize="10" fontFamily="var(--font-telemetry)" textAnchor="end">+{lastHour.toFixed(1)} h</text>
              {samples.map((pt, idx) => {
                const cx = mapIndexToX(idx);
                const cy = mapFluxToY(pt.flux);
                const isDip = missionState.showingSharedExample && pt.isSharedDipWindow;
                return (
                  <g key={pt.label}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isDip ? 5 : 3.5}
                      fill={isDip ? 'var(--orbital-accent)' : 'var(--orbital-bg)'}
                      stroke={isDip ? 'var(--orbital-bg)' : 'var(--orbital-text)'}
                      strokeWidth="1.5"
                    />
                    <title>{pt.label} · {pt.flux.toFixed(6)} normalized flux</title>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mission-brief__plot-meta">
            <span>Hours from shared event (132.646 BKJD)</span>
            <span className="mission-brief__plot-meta-low">Low: {minFlux.toFixed(5)} normalized flux</span>
          </div>
        </div>

        {/* Right Column: Two Equal-Weight Prediction Tracks & 3 Candidate Dates */}
        <div className="mission-brief__choices">
          {/* Step 1: Two Equal-Weight Prediction Tracks */}
          <div className="mission-brief__panel">
            <div className="mission-brief__panel-header">
              <div>
                <div className="mission-brief__panel-eyebrow">
                  Your Prediction · Optional
                </div>
                <h2>Competing Ephemeris Hypotheses</h2>
              </div>
              <span className={`mission-brief__status-tag ${missionState.selectedTrackId ? 'mission-brief__status-tag--selected' : 'mission-brief__status-tag--muted'}`}>
                {missionState.selectedTrackId ? 'Track Selected' : 'No Prediction Selected'}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Prediction Tracks"
              className="mission-brief__hypotheses-grid"
            >
              {missionState.predictionTracks.map((track) => {
                const isSelected = missionState.selectedTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => adapter.selectPredictionTrack(track.id)}
                    className={`mission-brief__card ${isSelected ? 'mission-brief__card--selected' : ''}`}
                  >
                    <div>
                      <div className="mission-brief__card-header">
                        <span className="mission-brief__card-title">
                          {track.teamName}
                        </span>
                        <span className="mission-brief__card-badge">
                          {isSelected ? '● Selected' : 'Select'}
                        </span>
                      </div>
                      <div className="mission-brief__card-sub">
                        {track.modelCode}
                      </div>
                      <p className="mission-brief__card-desc">
                        {track.hypothesisSummary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Three Candidate Dates (No Default Selection) */}
          <div className="mission-brief__panel">
            <div className="mission-brief__panel-header">
              <div>
                <div className="mission-brief__panel-eyebrow">
                  Choose One Observation Window · Required
                </div>
                <h2>Candidate Archive Observation Dates</h2>
              </div>
              <span className={`mission-brief__status-tag ${missionState.selectedDateId ? 'mission-brief__status-tag--selected' : 'mission-brief__status-tag--warning'}`}>
                {missionState.selectedDateId ? 'Date Selected' : 'Action Required: Pick 1 Date'}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Candidate Observation Dates"
              className="mission-brief__dates-grid"
            >
              {missionState.candidateDates.map((dateItem) => {
                const isSelected = missionState.selectedDateId === dateItem.id;
                return (
                  <button
                    key={dateItem.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => adapter.selectCandidateDate(dateItem.id)}
                    className={`mission-brief__card ${isSelected ? 'mission-brief__card--selected' : ''}`}
                  >
                    <div>
                      <div className="mission-brief__card-header">
                        <span className="mission-brief__card-title">
                          {dateItem.archiveDate}
                        </span>
                      </div>
                      <div className="mission-brief__card-sub">
                        {dateItem.relativeHours}
                      </div>
                      <p className="mission-brief__card-desc">
                        {dateItem.visibilityWindow}
                      </p>
                    </div>
                    <div className="mission-brief__card-footer">
                      <span className="truncate">{dateItem.ephemerisNote.split('·')[0]}</span>
                      <span className={isSelected ? 'text-[var(--orbital-accent)] font-semibold' : 'text-[var(--orbital-text-muted)]'}>
                        {isSelected ? '● Selected' : '○ Select'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lower Settings Bar: Contact conditions & Return policy */}
      <div className="mission-brief__settings-bar">
        <label>Contact conditions:
          <select value={missionState.caseId} onChange={event => adapter.chooseCase(event.target.value)}>
            <option value="nominal">Nominal · six packet slots</option>
            <option value="timing">Timing sensitivity · capture starts one hour later</option>
            <option value="short">Short contact · four packet slots</option>
          </select>
        </label>
        <label>Return policy:
          <select value={missionState.policy} onChange={event => adapter.choosePolicy(event.target.value)}>
            <option value="all">All six readings</option>
            <option value="bracket">Bracket four · sample both sides of the window</option>
          </select>
        </label>
      </div>

      {missionState.notice && <p role="status" className="mission-brief__notice">{missionState.notice}</p>}

      {/* Bottom Footer Actions */}
      <footer className="mission-brief__footer">
        <div className="mission-brief__footer-status">
          {missionState.selectedDateId ? (
            <span className="mission-brief__footer-status--selected">
              Window selected: Ready to continue
            </span>
          ) : (
            <span className="mission-brief__footer-status--required">
              Choose an observation window to continue
            </span>
          )}
        </div>

        <div className="mission-brief__footer-actions">
          <button
            type="button"
            disabled={!missionState.selectedDateId}
            onClick={adapter.useStarterSpacecraft}
            className="orbital-btn"
          >
            Use editable starter
          </button>
          <button
            type="button"
            disabled={!missionState.selectedDateId}
            onClick={() => adapter.lockPredictionAndProceed()}
            className="orbital-btn orbital-btn-primary"
          >
            <span>Continue to spacecraft workshop</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>
  );
};
