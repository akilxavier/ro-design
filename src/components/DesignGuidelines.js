import React from 'react';

const DesignGuidelines = ({ isOpen, onClose, currentWaterType }) => {
  if (!isOpen) return null;

  // Logic to highlight column based on Water Type
  const highlightColumn = (type) => currentWaterType.includes(type) ? 'rgba(0, 229, 255, 0.2)' : 'transparent';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', width: '90%', maxWidth: '1100px', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ background: '#004a80', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Design Guidelines</h3>
          <button onClick={onClose} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        
        <div style={{ padding: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ background: '#f2f2f2' }}>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Parameter</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Unit</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', background: highlightColumn('Brackish Well') }}>Brackish Well</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', background: highlightColumn('Surface') }}>Brackish Surface</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', background: highlightColumn('Sea') }}>Sea Well</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', background: highlightColumn('Waste') }}>Municipal Waste</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>Avg Flux (Typical)</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>gfd</td>
                <td style={{ textAlign: 'center', border: '1px solid #ddd', background: highlightColumn('Brackish Well') }}>16</td>
                <td style={{ textAlign: 'center', border: '1px solid #ddd', background: highlightColumn('Surface') }}>13</td>
                <td style={{ textAlign: 'center', border: '1px solid #ddd', background: highlightColumn('Sea') }}>10</td>
                <td style={{ textAlign: 'center', border: '1px solid #ddd', background: highlightColumn('Waste') }}>10</td>
              </tr>
              {/* Add more rows here as needed */}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '15px', background: '#f4f4f4', textAlign: 'right' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}>Print</button>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#7f8c8d', color: 'white', border: 'none', borderRadius: '4px' }}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default DesignGuidelines;