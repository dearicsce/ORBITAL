// Generated from data/campaign-contracts.json by tools/sync-contracts.mjs.
export default {
  "schemaVersion": 2,
  "original": {
    "m1": {
      "chapter": "earth",
      "requires": [],
      "payload": "optical_camera",
      "objective": "Deliver useful flood observations",
      "profile": {
        "coverage": 45,
        "delivered": 3,
        "contact": 0.25,
        "eclipse": 0.25,
        "incidents": [
          "contact",
          "battery"
        ]
      },
      "missionDifficulty": 1
    },
    "m2": {
      "chapter": "network",
      "requires": [
        "m1"
      ],
      "payload": "transponder_s",
      "objective": "Keep remote communities connected",
      "profile": {
        "coverage": 50,
        "delivered": 0,
        "relay": true,
        "contact": 0.65,
        "eclipse": 0.12,
        "incidents": [
          "battery",
          "radiation"
        ]
      },
      "missionDifficulty": 2
    },
    "m3": {
      "chapter": "frontier",
      "requires": [
        "m2"
      ],
      "payload": "spectrometer",
      "objective": "Complete the lunar ice survey",
      "profile": {
        "coverage": 45,
        "delivered": 1,
        "contact": 0.25,
        "eclipse": 0.3,
        "incidents": [
          "radiation",
          "debris"
        ]
      },
      "missionDifficulty": 3
    }
  },
  "contracts": [
    {
      "id": "wildfire",
      "name": "Wildfire sentinel",
      "chapter": "earth",
      "tag": "Emergency response",
      "brief": "Locate emerging heat signatures before the next ground contact. Every observation competes for power and downlink.",
      "budget": 70,
      "targetLifetime": 1,
      "launchers": [
        "kestrel",
        "condor"
      ],
      "requires": [
        "m1"
      ],
      "relevance": {
        "thermal_imager": 1.8,
        "optical_camera": 0.6,
        "weather_imager": 0.5
      },
      "orbitFit": {
        "sso": 1,
        "leo": 0.9
      },
      "starThresholds": [
        2,
        3,
        4,
        5
      ],
      "image": "images/missions/m1.jpg",
      "payload": "thermal_imager",
      "objective": "Map active heat signatures",
      "profile": {
        "coverage": 48,
        "delivered": 1.6,
        "heat": 1.25,
        "contact": 0.22,
        "eclipse": 0.3,
        "incidents": [
          "thermal",
          "contact"
        ]
      },
      "fixedEvents": [],
      "missionDifficulty": 2
    },
    {
      "id": "ocean",
      "name": "Ocean pulse",
      "chapter": "earth",
      "tag": "Climate science",
      "brief": "Follow changes across an ocean survey. Collect repeat observations without filling the recorder before a ground pass.",
      "budget": 85,
      "targetLifetime": 2,
      "launchers": [
        "kestrel",
        "condor"
      ],
      "requires": [
        "m1"
      ],
      "relevance": {
        "weather_imager": 1.5,
        "optical_camera": 1,
        "thermal_imager": 1
      },
      "orbitFit": {
        "sso": 1,
        "leo": 0.85
      },
      "starThresholds": [
        2,
        3,
        4,
        5
      ],
      "image": "images/missions/m1.jpg",
      "payload": "weather_imager",
      "objective": "Deliver the ocean survey",
      "profile": {
        "coverage": 52,
        "delivered": 3,
        "contact": 0.16,
        "eclipse": 0.2,
        "incidents": [
          "storage",
          "contact"
        ]
      },
      "fixedEvents": [],
      "missionDifficulty": 2
    },
    {
      "id": "ice",
      "name": "Ice frontier",
      "chapter": "earth",
      "tag": "Polar science",
      "brief": "Survey polar ice through repeated shadow passages. A larger payload is only useful if the battery keeps it alive.",
      "budget": 90,
      "targetLifetime": 2,
      "launchers": [
        "kestrel",
        "condor"
      ],
      "requires": [
        "m1"
      ],
      "relevance": {
        "optical_camera": 1.5,
        "thermal_imager": 1,
        "radar_imager": 1.5
      },
      "orbitFit": {
        "sso": 1,
        "leo": 0.7
      },
      "starThresholds": [
        2,
        3,
        4,
        5
      ],
      "image": "images/missions/m3.jpg",
      "payload": "optical_camera",
      "objective": "Complete the polar survey",
      "profile": {
        "coverage": 48,
        "delivered": 3,
        "eclipse": 0.42,
        "contact": 0.25,
        "incidents": [
          "battery",
          "contact"
        ]
      },
      "fixedEvents": [],
      "missionDifficulty": 3
    },
    {
      "id": "storm",
      "name": "Storm tracker",
      "chapter": "network",
      "tag": "Weather intelligence",
      "brief": "Keep a developing storm under observation and transmit the measurements before storage saturates.",
      "budget": 130,
      "targetLifetime": 2,
      "launchers": [
        "kestrel",
        "condor"
      ],
      "requires": [
        "m2"
      ],
      "relevance": {
        "weather_imager": 1.8,
        "thermal_imager": 1,
        "optical_camera": 0.7
      },
      "orbitFit": {
        "sso": 1,
        "geo": 0.9,
        "leo": 0.8
      },
      "starThresholds": [
        2,
        3,
        4,
        5
      ],
      "image": "images/missions/m1.jpg",
      "payload": "weather_imager",
      "objective": "Return the storm observations",
      "profile": {
        "coverage": 55,
        "delivered": 4,
        "contact": 0.2,
        "eclipse": 0.22,
        "incidents": [
          "contact",
          "storage"
        ]
      },
      "fixedEvents": [],
      "missionDifficulty": 3
    },
    {
      "id": "night",
      "name": "Night watch",
      "chapter": "network",
      "tag": "Energy management",
      "brief": "Measure the night side of Earth. Protect the energy reserve while preparing observations for the next radio pass.",
      "budget": 120,
      "targetLifetime": 2,
      "launchers": [
        "kestrel",
        "condor"
      ],
      "requires": [
        "m2"
      ],
      "relevance": {
        "thermal_imager": 2,
        "optical_camera": 0.3,
        "weather_imager": 0.5
      },
      "orbitFit": {
        "leo": 1,
        "sso": 0.85
      },
      "starThresholds": [
        2,
        3,
        4,
        5
      ],
      "image": "images/missions/m2.jpg",
      "payload": "thermal_imager",
      "objective": "Complete the night-side survey",
      "profile": {
        "coverage": 45,
        "delivered": 0.75,
        "nightScience": true,
        "contact": 0.3,
        "eclipse": 0.42,
        "incidents": [
          "battery",
          "thermal"
        ]
      },
      "fixedEvents": [],
      "missionDifficulty": 3
    },
    {
      "id": "solar",
      "name": "Solar guardian",
      "chapter": "network",
      "tag": "Space weather",
      "brief": "Maintain a science watch while a radiation alert tests your recovery plan. Safe mode protects hardware but interrupts observations.",
      "budget": 180,
      "targetLifetime": 3,
      "launchers": [
        "condor",
        "albatross"
      ],
      "requires": [
        "m2"
      ],
      "relevance": {
        "magnetometer": 5,
        "weather_imager": 0.2
      },
      "orbitFit": {
        "geo": 1,
        "leo": 0.8,
        "sso": 0.8
      },
      "starThresholds": [
        1,
        2,
        3,
        4
      ],
      "image": "images/missions/m2.jpg",
      "payload": "magnetometer",
      "objective": "Sustain the space-weather watch",
      "profile": {
        "coverage": 55,
        "delivered": 0.02,
        "contact": 0.35,
        "eclipse": 0.16,
        "incidents": [
          "radiation",
          "contact"
        ]
      },
      "fixedEvents": [],
      "missionDifficulty": 4
    },
    {
      "id": "mapping",
      "name": "Lunar cartographer",
      "chapter": "frontier",
      "tag": "Precision mapping",
      "brief": "Map the lunar surface with precision instruments. Balance laser measurements, pointing quality and the long return link.",
      "budget": 260,
      "targetLifetime": 1.5,
      "launchers": [
        "albatross",
        "roc"
      ],
      "requires": [
        "m3"
      ],
      "relevance": {
        "laser_altimeter": 1.5,
        "spectrometer": 1,
        "optical_camera": 0.7
      },
      "orbitFit": {
        "llo": 1
      },
      "starThresholds": [
        2,
        3,
        4,
        5
      ],
      "image": "images/missions/m3.jpg",
      "payload": "laser_altimeter",
      "objective": "Map the lunar surface",
      "profile": {
        "coverage": 50,
        "delivered": 0.8,
        "contact": 0.24,
        "eclipse": 0.3,
        "incidents": [
          "debris",
          "contact"
        ]
      },
      "fixedEvents": [],
      "missionDifficulty": 4
    },
    {
      "id": "relay",
      "name": "Far-side relay",
      "chapter": "frontier",
      "tag": "Lunar communications",
      "brief": "Keep a lunar relay working through interrupted contact periods. Store traffic, protect energy and deliver when Earth returns to view.",
      "budget": 270,
      "targetLifetime": 2,
      "launchers": [
        "albatross",
        "roc"
      ],
      "requires": [
        "m3"
      ],
      "relevance": {
        "transponder_s": 2,
        "transponder_m": 1.5,
        "transponder_l": 1.2
      },
      "orbitFit": {
        "llo": 1,
        "lagrange": 0.9
      },
      "starThresholds": [
        2,
        3,
        4,
        5
      ],
      "image": "images/missions/m3.jpg",
      "payload": "transponder_s",
      "objective": "Maintain relay availability",
      "profile": {
        "coverage": 48,
        "delivered": 0,
        "relay": true,
        "contact": 0.25,
        "eclipse": 0.3,
        "incidents": [
          "battery",
          "contact"
        ]
      },
      "fixedEvents": [],
      "missionDifficulty": 4
    },
    {
      "id": "observatory",
      "name": "Deep-space observatory",
      "chapter": "frontier",
      "tag": "The final frontier",
      "brief": "Return high-value spectral observations from a distant observatory. Weak communications and radiation make operational discipline essential.",
      "budget": 320,
      "targetLifetime": 3,
      "launchers": [
        "albatross",
        "roc"
      ],
      "requires": [
        "m3"
      ],
      "relevance": {
        "spectrometer": 1.8,
        "magnetometer": 1,
        "thermal_imager": 1
      },
      "orbitFit": {
        "lagrange": 1,
        "llo": 0.65
      },
      "starThresholds": [
        3,
        4,
        5,
        7
      ],
      "image": "images/missions/m3.jpg",
      "payload": "spectrometer",
      "objective": "Return deep-space science",
      "profile": {
        "coverage": 52,
        "delivered": 1,
        "contact": 0.18,
        "eclipse": 0,
        "incidents": [
          "radiation",
          "storage"
        ]
      },
      "fixedEvents": [],
      "missionDifficulty": 5
    }
  ]
};
