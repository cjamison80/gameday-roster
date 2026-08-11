import fs from 'node:fs';

const path = 'src/pages/PlayerProfilePage.jsx';
let s = fs.readFileSync(path, 'utf8');

const start = s.indexOf("            {[\n              { label: 'Height'");
const endMarker = "          </div>\n        </div>\n\n        {/* Parent / Guardian info */}";
const end = s.indexOf(endMarker, start);
if (start === -1 || end === -1) {
  throw new Error('Could not locate height/weight display block');
}

const newBlock = `            {editing ? (
              <>
                <div className="grid grid-cols-2 gap-3 py-2 border-b border-gray-50">
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: '#5B6475' }}>Height - Feet</label>
                    <input
                      type="number"
                      min="3"
                      max="7"
                      value={editData.height_inches ? Math.floor(Number(editData.height_inches) / 12) : ''}
                      onChange={e => {
                        const feet = Number(e.target.value || 0);
                        const inches = Number(editData.height_inches || 0) % 12;
                        setEditData(d => ({ ...d, height_inches: e.target.value ? (feet * 12) + inches : null }));
                      }}
                      placeholder="4"
                      className="w-full px-3 py-2 text-sm border border-gray-200 outline-none"
                      style={{ color: '#0B1528' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: '#5B6475' }}>Height - Inches</label>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={editData.height_inches ? Number(editData.height_inches) % 12 : ''}
                      onChange={e => {
                        const feet = Math.floor(Number(editData.height_inches || 0) / 12);
                        const inches = Math.max(0, Math.min(11, Number(e.target.value || 0)));
                        setEditData(d => ({ ...d, height_inches: e.target.value || feet ? (feet * 12) + inches : null }));
                      }}
                      placeholder="10"
                      className="w-full px-3 py-2 text-sm border border-gray-200 outline-none"
                      style={{ color: '#0B1528' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-2 border-b border-gray-50">
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: '#5B6475' }}>Weight - lbs</label>
                    <input
                      type="number"
                      min="40"
                      max="350"
                      value={editData.weight_lbs || ''}
                      onChange={e => setEditData(d => ({ ...d, weight_lbs: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="80"
                      className="w-full px-3 py-2 text-sm border border-gray-200 outline-none"
                      style={{ color: '#0B1528' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: '#5B6475' }}>Travel Radius</label>
                    <input
                      type="number"
                      min="0"
                      value={editData.travel_radius_miles || ''}
                      onChange={e => setEditData(d => ({ ...d, travel_radius_miles: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="100"
                      className="w-full px-3 py-2 text-sm border border-gray-200 outline-none"
                      style={{ color: '#0B1528' }}
                    />
                  </div>
                </div>

                <div className="py-2">
                  <label className="text-xs font-semibold block mb-1" style={{ color: '#5B6475' }}>Current Team</label>
                  <input
                    value={editData.current_team_name || ''}
                    onChange={e => setEditData(d => ({ ...d, current_team_name: e.target.value }))}
                    placeholder="Team name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 outline-none"
                    style={{ color: '#0B1528' }}
                  />
                </div>
              </>
            ) : (
              [
                { label: 'Height', value: player.height_inches ? \`${'${'}Math.floor(player.height_inches/12)}'${'${'}player.height_inches%12}\\"\` : 'Not set' },
                { label: 'Weight', value: player.weight_lbs ? \`${'${'}player.weight_lbs} lbs\` : 'Not set' },
                { label: 'Travel Radius', value: player.travel_radius_miles ? \`${'${'}player.travel_radius_miles} miles\` : 'Not set' },
                { label: 'Current Team', value: player.current_team_name || 'Not set' }
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm" style={{ color: '#5B6475' }}>{label}</span>
                  <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>{value}</span>
                </div>
              ))
            )}
`;

s = s.slice(0, start) + newBlock + s.slice(end);

// Hide the older duplicate Perfect Game section in Linked Profiles. Keep GameChanger/Sideline there.
s = s.replace(
  "        {/* Linked profiles: Perfect Game + GameChanger + Sideline HD */}\n        {(pgProfileUrl || player.gamechanger_url || player.sidelinehd_url || (isOwner && editing)) && (",
  "        {/* Linked profiles: GameChanger + Sideline HD */}\n        {(player.gamechanger_url || player.sidelinehd_url || (isOwner && editing)) && ("
);

const pgSectionStart = s.indexOf("              <div>\n                {editing ? (\n                  <div className=\" p-4\"", s.indexOf("{/* Linked profiles:"));
const gcStart = s.indexOf("              <div>\n                {editing ? (\n                  <>\n                    <label className=\"text-xs font-semibold block mb-1\" style={{ color: '#5B6475' }}>GameChanger URL</label>", pgSectionStart);
if (pgSectionStart !== -1 && gcStart !== -1) {
  s = s.slice(0, pgSectionStart) + s.slice(gcStart);
}

fs.writeFileSync(path, s);
console.log('patched PlayerProfilePage height/weight and Perfect Game sections');
