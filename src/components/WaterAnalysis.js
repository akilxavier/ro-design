import React, { useMemo } from 'react';

const WaterAnalysis = ({ waterData, setWaterData }) => {
  
  // --- TECHNICAL CONSTANTS (Equivalent Weights) ---
  const EQ_WEIGHTS = {
    ca: 20.04, mg: 12.15, na: 23.00, k: 39.10,
    hco3: 61.02, so4: 48.03, cl: 35.45, no3: 62.00
  };

  const WATER_TYPE_PROFILES = {
    'Municipal Waste': {
      type: 'absolute',
      ions: {
        na: 786.98,
        cl: 1212.92,
        hco3: 0.5
      }
    },
    'Brackish Well Non-Fouling': {
      type: 'ratio',
      ions: {
        ca: 0.12,
        mg: 0.05,
        na: 0.32,
        k: 0.01,
        hco3: 0.18,
        so4: 0.07,
        cl: 0.23,
        no3: 0.01,
        sio2: 0.01
      }
    },
    'Brackish Well High-Fouling': {
      type: 'ratio',
      ions: {
        ca: 0.14,
        mg: 0.07,
        na: 0.28,
        k: 0.01,
        hco3: 0.22,
        so4: 0.08,
        cl: 0.18,
        no3: 0.01,
        sio2: 0.01
      }
    },
    'Brackish Surface': {
      type: 'ratio',
      ions: {
        ca: 0.1,
        mg: 0.06,
        na: 0.3,
        k: 0.01,
        hco3: 0.2,
        so4: 0.1,
        cl: 0.21,
        no3: 0.01,
        sio2: 0.01
      }
    },
    'Sea Well': {
      type: 'ratio',
      ions: {
        ca: 0.015,
        mg: 0.05,
        na: 0.305,
        k: 0.01,
        hco3: 0.005,
        so4: 0.045,
        cl: 0.565,
        no3: 0.002,
        sio2: 0.003
      }
    },
    'Sea Surface': {
      type: 'absolute',
      ions: {
        na: 786.98,
        cl: 1212.92,
        hco3: 0.5
      }
    },
    'Industrial Waste': {
      type: 'ratio',
      ions: {
        ca: 0.08,
        mg: 0.04,
        na: 0.35,
        k: 0.02,
        hco3: 0.12,
        so4: 0.1,
        cl: 0.26,
        no3: 0.01,
        sio2: 0.02
      }
    },
    'RO Permeate': {
      type: 'ratio',
      ions: {
        na: 0.4,
        cl: 0.6
      }
    },
    'Well Water': {
      type: 'ratio',
      ions: {
        ca: 0.12,
        mg: 0.08,
        na: 0.2,
        k: 0.01,
        hco3: 0.22,
        so4: 0.1,
        cl: 0.25,
        no3: 0.01,
        sio2: 0.01
      }
    }
  };

  const applyTdsProfile = (tdsValue, waterType) => {
    const tds = Number(tdsValue) || 0;
    if (tds <= 0) return;
    const profile = WATER_TYPE_PROFILES[waterType] || WATER_TYPE_PROFILES['Well Water'];
    const updated = {
      ca: 0,
      mg: 0,
      na: 0,
      k: 0,
      hco3: 0,
      so4: 0,
      cl: 0,
      no3: 0,
      sio2: 0,
      nh4: waterData.nh4,
      sr: waterData.sr,
      ba: waterData.ba,
      po4: waterData.po4,
      f: waterData.f,
      b: waterData.b,
      co2: waterData.co2,
      co3: waterData.co3
    };
    if (profile.type === 'absolute') {
      const baseSum = Object.values(profile.ions).reduce((sum, value) => sum + (Number(value) || 0), 0);
      const scale = baseSum > 0 ? tds / baseSum : 0;
      Object.keys(profile.ions).forEach((key) => {
        updated[key] = Number((Number(profile.ions[key]) * scale).toFixed(2));
      });
    } else {
      Object.keys(profile.ions).forEach((key) => {
        updated[key] = Number((tds * profile.ions[key]).toFixed(2));
      });
    }
    setWaterData({
      ...waterData,
      calculatedTds: Number(tds.toFixed(0)),
      ...updated
    });
  };

  // --- LOGIC: IONIC BALANCE CALCULATION ---
  const balanceResults = useMemo(() => {
    const cations = 
      (Number(waterData.ca) / EQ_WEIGHTS.ca) + 
      (Number(waterData.mg) / EQ_WEIGHTS.mg) + 
      (Number(waterData.na) / EQ_WEIGHTS.na) + 
      (Number(waterData.k) / EQ_WEIGHTS.k);

    const anions = 
      (Number(waterData.hco3) / EQ_WEIGHTS.hco3) + 
      (Number(waterData.so4) / EQ_WEIGHTS.so4) + 
      (Number(waterData.cl) / EQ_WEIGHTS.cl) + 
      (Number(waterData.no3) / EQ_WEIGHTS.no3);

    const totalSum = cations + anions;
    const diff = cations - anions;
    const errorPct = totalSum > 0 ? (diff / totalSum) * 100 : 0;

    return { cations, anions, errorPct };
  }, [waterData]);

  // --- LOGIC: AUTO-BALANCE FEATURE ---
  const handleAutoBalance = () => {
    const diffMeq = balanceResults.cations - balanceResults.anions;
    
    if (diffMeq > 0) {
      // Too many cations (+), add Chloride (-) to balance
      const neededClMgL = Number(waterData.cl) + (diffMeq * EQ_WEIGHTS.cl);
      setWaterData({ ...waterData, cl: parseFloat(neededClMgL.toFixed(2)) });
    } else {
      // Too many anions (-), add Sodium (+) to balance
      const neededNaMgL = Number(waterData.na) + (Math.abs(diffMeq) * EQ_WEIGHTS.na);
      setWaterData({ ...waterData, na: parseFloat(neededNaMgL.toFixed(2)) });
    }
  };

  const handleInputChange = (key, val) => {
    if (key === 'calculatedTds') {
      setWaterData({ ...waterData, calculatedTds: val });
      applyTdsProfile(val, waterData.waterType);
      return;
    }
    if (key === 'waterType') {
      setWaterData({ ...waterData, waterType: val });
      if (Number(waterData.calculatedTds) > 0) {
        applyTdsProfile(waterData.calculatedTds, val);
      }
      return;
    }
    setWaterData({ ...waterData, [key]: val });
  };

  // --- STYLING ---
  const cardStyle = { background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #c2d1df', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
  const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '5px' };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#555' };
  const errorColor = Math.abs(balanceResults.errorPct) > 5 ? '#e74c3c' : '#27ae60';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      
      {/* LEFT COLUMN: ION INPUTS */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#002f5d' }}>Feed Water Composition</h3>
          <button 
            onClick={handleAutoBalance}
            style={{ background: '#3498db', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            ⚖️ Auto-Balance (Na/Cl)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Project</label>
            <input
              type="text"
              value={waterData.projectName || ''}
              onChange={(e) => handleInputChange('projectName', e.target.value)}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Client Name</label>
            <input
              type="text"
              value={waterData.clientName || ''}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Calculated By</label>
            <input
              type="text"
              value={waterData.calculatedBy || ''}
              onChange={(e) => handleInputChange('calculatedBy', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Water type</label>
            <select value={waterData.waterType || 'Well Water'} onChange={(e) => handleInputChange('waterType', e.target.value)}>
              <option value="Brackish Well Non-Fouling">Brackish Well Non-Fouling</option>
              <option value="Brackish Well High-Fouling">Brackish Well High-Fouling</option>
              <option value="Brackish Surface">Brackish Surface</option>
              <option value="Sea Well">Sea Well</option>
              <option value="Sea Surface">Sea Surface</option>
              <option value="Municipal Waste">Municipal Waste</option>
              <option value="Industrial Waste">Industrial Waste</option>
              <option value="RO Permeate">RO Permeate</option>
              <option value="Well Water">Well Water</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pretreatment</label>
            <select value={waterData.pretreatment || 'Conventional'} onChange={(e) => handleInputChange('pretreatment', e.target.value)}>
              <option value="Conventional">Conventional</option>
              <option value="UF">UF</option>
              <option value="MF">MF</option>
              <option value="None">None</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Calculated TDS (mg/L)</label>
            <input
              type="number"
              value={waterData.calculatedTds ?? 0}
              onChange={(e) => handleInputChange('calculatedTds', e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '15px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Auto-fill from TDS</label>
            <button
              onClick={() => applyTdsProfile(waterData.calculatedTds, waterData.waterType)}
              style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Apply
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          {/* CATIONS */}
          <div style={inputGroupStyle}><label style={labelStyle}>Calcium (Ca)</label><input type="number" value={waterData.ca} onChange={(e) => handleInputChange('ca', e.target.value)} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>Magnesium (Mg)</label><input type="number" value={waterData.mg} onChange={(e) => handleInputChange('mg', e.target.value)} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>Sodium (Na)</label><input type="number" value={waterData.na} onChange={(e) => handleInputChange('na', e.target.value)} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>Potassium (K)</label><input type="number" value={waterData.k} onChange={(e) => handleInputChange('k', e.target.value)} /></div>
          
          {/* ANIONS */}
          <div style={inputGroupStyle}><label style={labelStyle}>Bicarbonate (HCO3)</label><input type="number" value={waterData.hco3} onChange={(e) => handleInputChange('hco3', e.target.value)} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>Sulfate (SO4)</label><input type="number" value={waterData.so4} onChange={(e) => handleInputChange('so4', e.target.value)} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>Chloride (Cl)</label><input type="number" value={waterData.cl} onChange={(e) => handleInputChange('cl', e.target.value)} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>Nitrate (NO3)</label><input type="number" value={waterData.no3} onChange={(e) => handleInputChange('no3', e.target.value)} /></div>
          
          {/* NEUTRALS */}
          <div style={inputGroupStyle}><label style={labelStyle}>Silica (SiO2)</label><input type="number" value={waterData.sio2} onChange={(e) => handleInputChange('sio2', e.target.value)} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>Temperature (°C)</label><input type="number" value={waterData.temp} onChange={(e) => handleInputChange('temp', e.target.value)} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>pH</label><input type="number" step="0.1" value={waterData.ph} onChange={(e) => handleInputChange('ph', e.target.value)} /></div>
        </div>
      </div>

      {/* RIGHT COLUMN: VALIDATION PANEL */}
      <div style={{ ...cardStyle, background: '#f8fbff' }}>
        <h4 style={{ marginTop: 0, color: '#002f5d' }}>Ionic Balance</h4>
        
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span>Total Cations:</span>
            <span>{balanceResults.cations.toFixed(2)} meq/L</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span>Total Anions:</span>
            <span>{balanceResults.anions.toFixed(2)} meq/L</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '15px', borderRadius: '6px', background: 'white', border: `2px solid ${errorColor}` }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Balance Error</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: errorColor }}>
            {balanceResults.errorPct.toFixed(2)}%
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: '5px' }}>
            {Math.abs(balanceResults.errorPct) <= 5 ? '✅ Analysis Valid' : '⚠️ Unbalanced Analysis'}
          </div>
        </div>

        <div style={{ marginTop: '20px', fontSize: '0.75rem', color: '#7f8c8d', lineHeight: '1.4' }}>
          <strong>Pro Tip:</strong> Professional designs require an error below 5%. Use the Auto-Balance tool to adjust Sodium or Chloride to reach 0%.
        </div>
      </div>
    </div>
  );
};

export default WaterAnalysis;