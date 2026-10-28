import re

file_path = 'C:/Users/jahjang/python/F125/project/frontend/src/App.jsx'

with open(file_path, 'rb') as f:
    raw_content = f.read()

import chardet
encoding = chardet.detect(raw_content)['encoding'] or 'utf-8'

try:
    content = raw_content.decode(encoding)
except Exception:
    content = raw_content.decode('utf-8', errors='replace')

pattern1 = re.compile(r'\{\/\* Corner Analysis Section \*\/.*?\}\)\n\s+<\/div>', re.DOTALL)

replacement1 = '''{/* Corner Analysis Section */}
      <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
        <div className="card-header">{t.cornerAnalysis}</div>
        {trackPoints && trackPoints.length > 0 && circuit_corners && circuit_corners.length > 0 ? (
           <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
                <thead style={{ backgroundColor: 'var(--color-surface-onyx)', color: '#aaa', borderBottom: '1px solid #333' }}>
                  <tr>
                    <th style={{ padding: '12px 8px' }}>TURN</th>
                    <th style={{ padding: '12px 8px' }}>BRAKE POINT</th>
                    <th style={{ padding: '12px 8px' }}>APEX GEAR</th>
                    <th style={{ padding: '12px 8px' }}>EXIT GEAR</th>
                    <th style={{ padding: '12px 8px' }}>EXIT THROTTLE</th>
                    <th style={{ padding: '12px 8px' }}>EXIT BRAKE</th>
                  </tr>
                </thead>
                <tbody>
                  {circuit_corners.map((c, i) => {
                     const entryIdx = trackPoints.findIndex(p => p.distance_m >= c.entry_dist);
                     const apexIdx = trackPoints.findIndex(p => p.distance_m >= c.apex_dist);
                     const exitIdx = trackPoints.findIndex(p => p.distance_m >= c.exit_dist);
                     
                     let brakeStartDist = null;
                     if (entryIdx !== -1) {
                        for (let j = entryIdx; j >= Math.max(0, entryIdx - 300); j--) {
                           if (trackPoints[j].brake > 2) {
                              brakeStartDist = trackPoints[j].distance_m;
                           } else if (brakeStartDist !== null) {
                              break;
                           }
                        }
                     }
                     
                     return (
                       <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                         <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#fff' }}>{c.name}</td>
                         <td style={{ padding: '12px 8px', color: '#ff3366' }}>{brakeStartDist ? brakeStartDist.toFixed(1) + 'm' : 'N/A'}</td>
                         <td style={{ padding: '12px 8px', color: '#ffcc00' }}>{apexIdx !== -1 ? trackPoints[apexIdx].gear : '-'}</td>
                         <td style={{ padding: '12px 8px', color: '#33ff33' }}>{exitIdx !== -1 ? trackPoints[exitIdx].gear : '-'}</td>
                         <td style={{ padding: '12px 8px', color: '#00aaff' }}>{exitIdx !== -1 ? trackPoints[exitIdx].throttle + '%' : '-'}</td>
                         <td style={{ padding: '12px 8px', color: '#ff3366' }}>{exitIdx !== -1 ? trackPoints[exitIdx].brake + '%' : '-'}</td>
                       </tr>
                     );
                  })}
                </tbody>
              </table>
           </div>
        ) : (
           <div style={{ color: 'var(--color-muted)', padding: '20px', textAlign: 'center' }}>
             {trackPoints && trackPoints.length > 0 ? "No circuit corner data configured for this track." : "Select a lap from Lap History to see corner analysis."}
           </div>
        )}
      </div>'''

content = pattern1.sub(replacement1, content)

pattern2 = re.compile(r'\{\/\* Corner Analysis Table \*\/.*?\}\)', re.DOTALL)
content = pattern2.sub('{/* Corner Analysis Table Removed */}', content)

with open(file_path, 'w', encoding=encoding) as f:
    f.write(content)
print("Done")
