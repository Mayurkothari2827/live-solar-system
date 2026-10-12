"""Export reference metadata from the same NAIF setup used by the API."""
import json
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root))
import server
server.initialize_spice()
assert len(server.BODIES)==30
(root/'assets/solar-directory.json').write_text(json.dumps({'source':'NASA/JPL Horizons body identifiers and NAIF kernel reference radii; no positions in this directory','bodies':server.BODIES},indent=2))
