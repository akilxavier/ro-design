/* ================= IMSDesign Hydraulic Engine (REFINED) ================= */

export const FLOW_TO_M3H = {
  gpm: 0.2271247,
  gpd: 0.000157725,
  mgd: 157.725,
  migd: 189.27,
  m3h: 1,
  m3d: 1 / 24,
  mld: 41.667,
  lph: 0.001,
  lpm: 0.06
};

  export const calculateSystem = (inputs) => {  
  const {
    totalFlow,
    recovery = 55,
    vessels = 0,
    elementsPerVessel = 0,
    feedPH = 7.0,
    tempF = 77,
    feedIons = {},
    stages = [],
    membranes = [],
    flowUnit = 'gpm',
    membraneAge = 0,
    fluxDeclinePerYear = 0,
    spIncreasePerYear = 0,
    foulingFactor = 1
  } = inputs;

  const recoveryPct = Math.min(Math.max(Number(recovery) || 0, 1), 99);
  const recFrac = recoveryPct / 100;
  const feedPhValue = Number(feedPH) || 7.0;
  const normalizedFeedIons = { ...(feedIons || {}) };
  const hco3Val = Number(normalizedFeedIons.hco3) || 0;
  const co2Val = Number(normalizedFeedIons.co2) || 0;
  const co3Val = Number(normalizedFeedIons.co3) || 0;
  if (co2Val === 0 && hco3Val > 0) {
    const pKa1 = 6.35;
    const ratio = Math.pow(10, pKa1 - feedPhValue);
    const co2Value = hco3Val * ratio;
    normalizedFeedIons.co2 = Number(co2Value < 0.001 ? '<0.001' : co2Value.toFixed(3));
  }
  if (co3Val === 0 && hco3Val > 0 && feedPhValue >= 8.2) {
    const pKa2 = 10.33;
    const ratio = Math.pow(10, feedPhValue - pKa2);
    const co3Value = hco3Val * ratio;
    normalizedFeedIons.co3 = Number(co3Value < 0.001 ? '<0.001' : co3Value.toFixed(3));
  }
  const tempC = (Number(tempF) - 32) * (5 / 9);
  const feedFlowTotal = recFrac > 0 ? Number(totalFlow) / recFrac : 0;
  const concentrateFlowTotal = feedFlowTotal - Number(totalFlow || 0);
  // const feedFlowPerVessel = feedFlowTotal / Number(vessels);
   const feedFlowPerVessel = Number(totalFlow || 0) / (Number(vessels) || 1);
   const concFlowPerVessel = feedFlowPerVessel - Number(totalFlow || 0) / (Number(vessels) || 1);
  const avgFlowPerVessel = (feedFlowPerVessel + concFlowPerVessel) / 2;

  const activeStages = Array.isArray(stages) ? stages.filter(stage => Number(stage?.vessels) > 0) : [];
  const activeMembraneId = activeStages[0]?.membraneModel || inputs.membraneModel;
  const activeMembrane = membranes.find(m => m.id === activeMembraneId) || membranes[0] || {};
  const areaPerElement = Number(activeMembrane.area) || 400;

  let totalElements = 0;
  let totalAreaSqFt = 0;
  if (activeStages.length > 0) {
    totalElements = activeStages.reduce((sum, stage) => {
      const stageVessels = Number(stage?.vessels) || 0;
      const stageElements = Number(stage?.elementsPerVessel) || 0;
      return sum + stageVessels * stageElements;
    }, 0);
    totalAreaSqFt = activeStages.reduce((sum, stage) => {
      const stageVessels = Number(stage?.vessels) || 0;
      const stageElements = Number(stage?.elementsPerVessel) || 0;
      const stageMembrane = membranes.find(m => m.id === stage?.membraneModel) || activeMembrane;
      const stageArea = Number(stageMembrane?.area) || areaPerElement;
      return sum + stageVessels * stageElements * stageArea;
    }, 0);
  } else {
    totalElements = (Number(vessels) || 0) * (Number(elementsPerVessel) || 0);
    totalAreaSqFt = totalElements * areaPerElement;
  }

  const effectiveAreaSqFt = totalAreaSqFt > 0 ? totalAreaSqFt : (totalElements * areaPerElement);
  const permeateFlowPerVessel = Number(totalFlow || 0) / (Number(vessels) || 1);
  const stageRecoveryVessel = permeateFlowPerVessel / feedFlowPerVessel;
  const avgFlux =
  totalElements > 0
    ? Number(totalFlow) / (totalElements * 0.0556)
    : 0;

  const highestFlux = avgFlux * (1 + (recFrac * 0.32));
  const recFracVessel = Number(totalFlow || 0) / feedFlowTotal;
  const highestBeta = Math.exp(0.7 * ((feedFlowPerVessel * vessels)));
  const beta = highestBeta;
  const cf = recFrac > 0 && recFrac < 1 ? Math.log(1 / (1 - recFrac)) / recFrac : 1;

  const membraneRejection = Math.min(Math.max(Number(activeMembrane?.rejection) || 99.7, 80), 99.9);
  const defaultMono = Math.max(Math.min((Number(activeMembrane?.monoRejection) || (membraneRejection - 6)), 99.9), 80);
  const defaultDivalent = Math.max(Math.min((Number(activeMembrane?.divalentRejection) || membraneRejection), 99.9), 80);
  const silicaRejection = Math.max(Math.min((Number(activeMembrane?.silicaRejection) || (membraneRejection - 1)), 99.9), 80);
  const boronRejection = Math.max(Math.min((Number(activeMembrane?.boronRejection) || (membraneRejection - 8)), 99.9), 60);
  const alkalinityRejection = Math.max(Math.min((Number(activeMembrane?.alkalinityRejection) || (membraneRejection - 0.2)), 99.9), 80);
  const co2Rejection = Math.max(Math.min((Number(activeMembrane?.co2Rejection) || 0), 99.9), 0);

  const getIonRejection = (ionKey) => {
    const overrides = activeMembrane?.ionRejectionOverrides || {};
    if (overrides[ionKey] != null) return Number(overrides[ionKey]);
    if (['ca', 'mg', 'sr', 'ba', 'so4', 'po4'].includes(ionKey)) return defaultDivalent;
    if (['na', 'k', 'cl', 'no3', 'f', 'nh4'].includes(ionKey)) return defaultMono;
    if (['hco3', 'co3'].includes(ionKey)) return alkalinityRejection;
    if (ionKey === 'sio2') return silicaRejection;
    if (ionKey === 'b') return boronRejection;
    if (ionKey === 'co2') return co2Rejection;
    return membraneRejection;
  };

  const formatConc = (value) => Number(value).toFixed(3);
  const permeateIons = {};
  const concentrateIons = {};
  let permeateTDS = 0;
  let concentrateTDS = 0;

  Object.keys(normalizedFeedIons || {}).forEach((ion) => {
    const feedConc = Number(normalizedFeedIons[ion]) || 0;
    if (ion === 'co2') {
      permeateIons[ion] = formatConc(feedConc);
      concentrateIons[ion] = formatConc(feedConc);
      permeateTDS += feedConc;
      concentrateTDS += feedConc;
      return;
    }
    let rejection = getIonRejection(ion);
    if (ion === 'nh4') {
      const nh3Fraction = Math.min(Math.max((feedPhValue - 7.2) / (11.5 - 7.2), 0), 1);
      rejection = rejection * (1 - nh3Fraction);
    }
    const passage = Math.max(1 - rejection / 100, 0);
    const saltPassage = passage * cf * beta;

    const permVal = feedConc * saltPassage;
    const concVal = recFrac > 0 && recFrac < 1 ? feedConc / (1 - recFrac) : feedConc;

    permeateIons[ion] = formatConc(permVal);
    concentrateIons[ion] = formatConc(concVal);
    permeateTDS += permVal;
    concentrateTDS += concVal;
  });

  const osmoticPressure = (0.0385 * concentrateTDS * (tempC + 273.15)) / 1000;
  const permeatePh = Math.min(Math.max(feedPhValue - 2.7, 0), 14);
  const concentratePh = Math.min(Math.max(feedPhValue + Math.log10(Math.max(cf, 1)) * 0.3, 0), 14);

  const pCa = -Math.log10((Number(concentrateIons.ca) || 0) / 40080 || 1);
  const pAlk = -Math.log10((Number(concentrateIons.hco3) || 0) / 61010 || 1);
  const C_const = (Math.log10(Math.max(concentrateTDS, 1)) - 1) / 10;
  const pHs = (9.3 + C_const) + pCa + pAlk;
  const lsi = concentratePh - pHs;
  const ccpp = lsi > 0 ? lsi * 50 : 0;

  const caConc = Number(concentrateIons.ca) || 0;
  const so4Conc = Number(concentrateIons.so4) || 0;
  const baConc = Number(concentrateIons.ba) || 0;
  const srConc = Number(concentrateIons.sr) || 0;
  const sio2Conc = Number(concentrateIons.sio2) || 0;
  const po4Conc = Number(concentrateIons.po4) || 0;
  const fConc = Number(concentrateIons.f) || 0;

  const concentrateSaturation = {
    caSo4: Number((caConc * so4Conc) / 1000).toFixed(1),
    baSo4: Number((baConc * so4Conc) / 50).toFixed(1),
    srSo4: Number((srConc * so4Conc) / 2000).toFixed(1),
    sio2: Number((sio2Conc / 120) * 100).toFixed(1),
    ca3po42: Number((caConc * po4Conc) / 100).toFixed(2),
    caF2: Number((caConc * fConc) / 500).toFixed(1)
  };

  const concentrateParameters = {
    osmoticPressure: osmoticPressure.toFixed(1),
    ccpp: Number(ccpp).toFixed(1),
    langelier: lsi.toFixed(2),
    ph: concentratePh.toFixed(1),
    tds: concentrateTDS.toFixed(1)
  };

  const permeateParameters = {
    ph: permeatePh.toFixed(1),
    tds: permeateTDS.toFixed(1)
  };

  const TCF = Math.exp(2640 * (1 / 298.15 - 1 / (tempC + 273.15)));
  const membraneAgeYears = Math.max(Number(membraneAge) || 0, 0);
  const fluxDeclinePct = Math.min(Math.max(Number(fluxDeclinePerYear) || 0, 0), 99);
  const spIncreasePct = Math.min(Math.max(Number(spIncreasePerYear) || 0, 0), 200);
  const foulingFactorRaw = Number(foulingFactor);
  const foulingFactorValue = Number.isFinite(foulingFactorRaw)
    ? Math.min(Math.max(foulingFactorRaw, 0.35), 1)
    : 1;
  const aBase = Number(activeMembrane.aValue) || 0.12;
  const aEffective = aBase * Math.pow(1 - fluxDeclinePct / 100, membraneAgeYears);
  const spFactor = Math.pow(1 + spIncreasePct / 100, membraneAgeYears);

  const BAR_TO_PSI = 14.5038;
  const M3H_TO_GPM = 4.402867;

  let currentFeedFlowM3h = feedFlowTotal;
  let currentFeedPressureBar = 0;
  const stageResults = [];

  activeStages.forEach((stage, index) => {
    const stageVessels = Number(stage?.vessels) || 0;
    const stageElements = Number(stage?.elementsPerVessel) || 0;
    const stageMembrane = membranes.find(m => m.id === stage?.membraneModel) || activeMembrane;

    if (stageVessels === 0 || stageElements === 0) return;

    const stagePermeateFlowM3h = index === 0 ? totalFlow / M3H_TO_GPM : currentFeedFlowM3h * recFrac;
    const stageConcentrateFlowM3h = currentFeedFlowM3h - stagePermeateFlowM3h;
    const perVesselFeedFlowM3h = stageVessels > 0 ? currentFeedFlowM3h / stageVessels : 0;
    const perVesselConcFlowM3h = stageVessels > 0 ? stageConcentrateFlowM3h / stageVessels : 0;
    const perVesselAvgFlowM3h = (perVesselFeedFlowM3h + perVesselConcFlowM3h) / 2;

    const stagePermeateFlowGpm = stagePermeateFlowM3h * M3H_TO_GPM;
    const stageAvgFlux = stagePermeateFlowGpm / (stageVessels * stageElements * 0.0556);
    const stageRecovery = stagePermeateFlowM3h / currentFeedFlowM3h;
    const stageHighestFlux = stageAvgFlux * (1 + stageRecovery * 0.32);
    const stageBeta = Math.exp(0.7 * stageRecovery);

    const aEffectiveStage = (stageMembrane.aValue || 0.12) * Math.pow(1 - fluxDeclinePct / 100, membraneAgeYears);
    const stageFeedPressureBar = (stageAvgFlux / aEffectiveStage) * foulingFactorValue * 0.0556 + osmoticPressure;
    const flowExponent = perVesselFeedFlowM3h > 4.5 ? Math.max(stageMembrane.dpExponent || 1.75, 1.75) : stageMembrane.dpExponent || 1.75;
    const stagePressureDropBar = stageElements * (stageMembrane.kFb || 0.315) * Math.pow(perVesselAvgFlowM3h, flowExponent) * (1 + 0.1 * (stageBeta - 1));
    const stageConcPressureBar = stageFeedPressureBar - stagePressureDropBar;

    stageResults.push({
      index: index + 1,
      vessels: stageVessels,
      feedPressurePsi: (stageFeedPressureBar * BAR_TO_PSI).toFixed(1),
      concPressurePsi: (stageConcPressureBar * BAR_TO_PSI).toFixed(1),
      feedFlowGpm: (perVesselFeedFlowM3h * M3H_TO_GPM).toFixed(2),
      concFlowGpm: (perVesselConcFlowM3h * M3H_TO_GPM).toFixed(2),
      fluxGfd: stageAvgFlux.toFixed(1),
      highestFluxGfd: stageHighestFlux.toFixed(1),
      highestBeta: stageBeta.toFixed(2)
    });

    currentFeedFlowM3h = stageConcentrateFlowM3h;
    currentFeedPressureBar = stageConcPressureBar;
  });

  const systemHighestFlux = stageResults.length > 0 ? Math.max(...stageResults.map(s => Number(s.highestFluxGfd))) : highestFlux;
  const systemHighestBeta = stageResults.length > 0 ? Math.max(...stageResults.map(s => Number(s.highestBeta))) : beta;

  const designWarnings = [];
  
  if (systemHighestFlux > 20) designWarnings.push('Design limits exceeded: Flux too high');
  if (feedFlowPerVessel > 4.5) designWarnings.push('Design limits exceeded: Feed flow per vessel too high');
  if (currentFeedPressureBar < 0) designWarnings.push('Design limits exceeded: Concentrate pressure is negative');
  if (!Number.isFinite(osmoticPressure) || osmoticPressure < 0) designWarnings.push('Design limits exceeded: Osmotic pressure invalid');

 

  return {
    results: {
      avgFlux: Number(avgFlux.toFixed(2)),
      highestFlux: Number(systemHighestFlux.toFixed(2)),
      feedFlowVessel: Number(feedFlowPerVessel.toFixed(2)),
      concFlowVessel: Number(concFlowPerVessel.toFixed(2)),
      feedPressure: Number(feedFlowPerVessel > 0 ? (feedFlowPerVessel / aEffective) * foulingFactorValue * 0.0556 + osmoticPressure : 0).toFixed(2),
      concPressure: Number(feedFlowPerVessel > 0 ? (feedFlowPerVessel / aEffective) * foulingFactorValue * 0.0556 + osmoticPressure : 0).toFixed(2),
      highestBeta: systemHighestBeta < 0.001 ? '<0.001' : systemHighestBeta.toFixed(3),
      lsi: Number(lsi.toFixed(2)),
      permTDS: Number(permeateTDS.toFixed(2)),
      concTDS: Number(concentrateTDS.toFixed(2)),
      permPH: Number(permeatePh.toFixed(1)),
      
    },
    permeateIons,
    concentrateIons,
    concentrateSaturation,
    concentrateParameters,
    permeateParameters,
    stageResults,
    designWarnings
  };
};






export const calculateIonPassage = (feedIons, systemData) => {
  const { recovery, tempC, vessels, feedPH } = systemData;
  const feedPhValue = Number(feedPH) || 7.0;
  const recoveryPct = Math.min(Math.max(Number(recovery) || 0, 1), 99);
  const recFrac = recoveryPct / 100;

  // 1. Beta Factor (Concentration Polarization)
  const beta = Math.exp(0.7 * recFrac);

  // 2. Average Concentrate Concentration Factor (CF)
  const cf = recFrac > 0 && recFrac < 1 ? Math.log(1 / (1 - recFrac)) / recFrac : 1;

  // 3. Membrane Rejection Characteristics (Standard for ESPA2-LD)
  const rejections = {
    Ca: 0.994,
    Mg: 0.994,
    Na: 0.990,
    K: 0.985,
    Cl: 0.988,
    SO4: 0.997,
    HCO3: 0.980,
    NO3: 0.920,
    CO2: 0.0
  };

  let permeateTDS = 0;
  const permeateIons = {};
  const concentrateIons = {};

  Object.keys(feedIons || {}).forEach((ion) => {
    const feedConc = Number(feedIons[ion]) || 0;
    if (ion === 'CO2' || ion === 'co2') {
      permeateIons[ion] = feedConc;
      concentrateIons[ion] = feedConc;
      permeateTDS += feedConc;
      return;
    }
    let rej = rejections[ion] != null ? rejections[ion] : 0.99;
    if (ion === 'NH4' || ion === 'nh4') {
      const nh3Fraction = Math.min(Math.max((feedPhValue - 7.2) / (11.5 - 7.2), 0), 1);
      rej = rej * (1 - nh3Fraction);
    }

    // Salt Passage = (1 - Rejection) * CF * Beta
    const saltPassage = (1 - rej) * cf * beta;

    permeateIons[ion] = feedConc * saltPassage;
    concentrateIons[ion] = recFrac > 0 && recFrac < 1 ? feedConc / (1 - recFrac) : feedConc;
    permeateTDS += permeateIons[ion];
  });

  // 4. Langelier Saturation Index (LSI) Approximation
  const tds_conc = Object.values(concentrateIons).reduce((a, b) => a + (Number(b) || 0), 0);
  const pCa = -Math.log10((concentrateIons.Ca || 0) / 40080 || 1);
  const pAlk = -Math.log10((concentrateIons.HCO3 || 0) / 61010 || 1);
  const C_const = (Math.log10(tds_conc || 1) - 1) / 10;
  const pHs = (9.3 + C_const) + pCa + pAlk;

  const lsi = 7.3 - pHs;

  return {
    permeateIons,
    concentrateIons,
    permeateTDS: permeateTDS.toFixed(2),
    lsi: lsi.toFixed(2),
    beta: beta.toFixed(2),
    tempC,
    vessels
  };
};
  
  export const runHydraulicBalance = (config, membrane) => {
  /* ---------- 1. RAW INPUTS & SAFETY ---------- */
  const permeateInput = Number(config.permeateFlow) || 0; // user input
  const unit = config.flowUnit || 'gpm';
  const unitFactor = FLOW_TO_M3H[unit] ?? 1;

  // Clamp recovery between 1% and 99%
  const recoveryPercent = Math.min(Math.max(Number(config.recovery) || 15, 1), 99);
  const recovery = recoveryPercent / 100;

  const vessels = Number(config.stage1Vessels) || 1; // default 1 vessel
  const elementsPerVessel = Number(config.elementsPerVessel) || 7; // default 7 membranes/vessel

  // Membrane area (not needed for this formula, but keep for completeness)
  const elementArea = Number(membrane?.area) || 400;

  /* ---------- 2. HYDRAULIC BALANCE ---------- */
  // Convert permeate flow to m3/h for internal calculations
  const permeate_m3h = permeateInput * unitFactor;
  const feed_m3h = permeate_m3h / recovery;
  const concentrate_m3h = feed_m3h - permeate_m3h;

  /* ---------- 3. AVERAGE FLUX CALCULATION (GFD) ---------- */
  let calcFluxGfd = 0;
  const totalElements = vessels * elementsPerVessel;

  if (totalElements > 0) {
    calcFluxGfd = permeateInput / (totalElements * 0.0556);
  }

  /* ---------- 4. UNIT BACK-CONVERSION ---------- */
  const feedDisplay = feed_m3h / unitFactor;
  const concDisplay = concentrate_m3h / unitFactor;

  return {
    feedFlow: feedDisplay.toFixed(2),
    concentrateFlow: concDisplay.toFixed(2),
    permeateFlow: permeateInput.toFixed(2),
    totalElements: totalElements,
    calcFluxGfd: calcFluxGfd.toFixed(1), // This is your formula result for UI
    unit: unit
  };
};


