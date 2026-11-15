import { drawAvatar } from '../characters.js';
let starSerial=0;
// Judge Star Renderers & Avatar SVGs for Flight Report

export function renderJudgeStars(stars, max = 2) {
  let starsHtml = '';
  const unique=++starSerial;
  for (let i = 1; i <= max; i++) {
    if (stars >= i) {
      starsHtml += `
        <svg class="judge-star" viewBox="0 0 24 24" width="16" height="16" fill="#fbbf24" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>`;
    } else if (stars >= i - 0.5) {
      starsHtml += `
        <svg class="judge-star" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <defs>
            <linearGradient id="rep-half-${unique}-${i}">
              <stop offset="50%" stop-color="#fbbf24"/>
              <stop offset="50%" stop-color="#1e293b"/>
            </linearGradient>
          </defs>
          <path fill="url(#rep-half-${unique}-${i})" stroke="#fbbf24" stroke-width="0.8" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>`;
    } else {
      starsHtml += `
        <svg class="judge-star" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="#0f172a" stroke="#475569" stroke-width="1.2" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>`;
    }
  }
  return `<div class="judge-stars-row">${starsHtml}<span class="judge-stars-score">${stars.toFixed(1)} / ${max}.0</span></div>`;
}

export function getAvatarSvg(role){return drawAvatar(role,150);}
