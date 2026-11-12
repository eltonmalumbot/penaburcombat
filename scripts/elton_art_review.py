"""Offline diagnostics for a verified Elton candidate; never game integration."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


def _write_contact_sheet(root: Path, doc: dict) -> None:
    """Produce a right/left review sheet from already validated frames."""
    sheet = Image.new('RGB', (2160, 12 * 294), '#dae1e8')
    draw = ImageDraw.Draw(sheet)
    for row, (move, clip) in enumerate(doc['clips'].items()):
        for left in (False, True):
            y = (row * 2 + int(left)) * 294
            for i, entry in enumerate(clip['frames']):
                x = i * 360
                for yy in range(0, 270, 16):
                    for xx in range(0, 360, 16):
                        if (xx // 16 + yy // 16) % 2:
                            draw.rectangle((x + xx, y + 24 + yy, min(x + xx + 15, x + 359), min(y + 24 + yy + 15, y + 293)), fill='#bac6d2')
                with Image.open(root / 'frames' / f'{move}-{i:02}.png') as frame:
                    frame = frame.resize((360, 270), Image.Resampling.LANCZOS)
                    if left:
                        frame = ImageOps.mirror(frame)
                    sheet.paste(frame, (x, y + 24), frame)
                pivot = x + (200 if left else 160)
                draw.line((x, y + 286, x + 359, y + 286), fill='#ed6215')
                draw.line((pivot, y + 279, pivot, y + 293), fill='#0084ee')
                draw.text((x + 4, y + 4), f'{move} {i:02} {"LEFT" if left else "RIGHT"} {entry["duration"]}s', fill='black')
    sheet.save(root / 'two-facings.png')


def _review_html(doc: dict) -> str:
    """Embed the pinned checksum and validated timing contract in a local reviewer."""
    # Only validated hashes, identifiers and numeric timings enter the script.
    config = {'sha': doc['combatOnlySha256'], 'clips': doc['clips']}
    return '''<!doctype html><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src blob:; connect-src 'none'">
<title>Elton candidate local review</title>
<style>body{font:16px system-ui;background:#18232f;color:white}canvas{background:repeating-conic-gradient(#dbe3eb 0% 25%,#b8c7d6 0% 50%) 0/32px 32px;max-width:100%}label,button,select{margin:8px}</style>
<h1>Elton — REVIEW ONLY / ART NOT APPROVED</h1>
<p>Select the exact elton-combat-frames.png from this package. No upload, production activation or gameplay override.</p>
<input id="file" type="file" accept="image/png"><p id="status">No candidate loaded</p>
<label>Move <select id="move"></select></label>
<label>Facing left <input id="left" type="checkbox"></label>
<label>Speed <select id="speed"><option>1</option><option>0.5</option><option>0.25</option></select></label>
<button id="step" disabled>Step</button><button id="play" disabled>Play</button><button id="reset">Reset</button>
<p id="frame"></p><canvas id="scene" width="720" height="540"></canvas>
<script>
const config = CONFIG;
const byId=id=>document.getElementById(id), canvas=byId('scene'),ctx=canvas.getContext('2d');
let image=null,index=0,playing=false,elapsed=0,last=0,generation=0;
const moves=Object.keys(config.clips);
for(const move of moves)byId('move').add(new Option(move,move));
function stop(){playing=false;byId('play').textContent='Play'}
function render(){ctx.clearRect(0,0,720,540);if(!image)return;
 const row=moves.indexOf(byId('move').value),left=byId('left').checked;
 ctx.save();if(left){ctx.translate(720,0);ctx.scale(-1,1)}
 ctx.drawImage(image,index*720,row*540,720,540,0,0,720,540);ctx.restore();
 ctx.strokeStyle='#ff6611';ctx.beginPath();ctx.moveTo(0,525);ctx.lineTo(720,525);ctx.stroke();
 const pivot=left?400:320;ctx.strokeStyle='#007fff';ctx.beginPath();ctx.moveTo(pivot,515);ctx.lineTo(pivot,535);ctx.stroke();
 const f=config.clips[byId('move').value].frames[index];
 byId('frame').textContent=`${byId('move').value} ${index+1}/6 ${index<2?'startup':index<4?'contact':'recovery'} ${f.duration}s`;
}
byId('file').onchange=async()=>{const ticket=++generation;stop();image=null;render();byId('step').disabled=byId('play').disabled=true;
 let url;
 try{const file=byId('file').files[0];if(!file)return;if(file.size>20*1024*1024)throw Error('File too large');
 const bytes=await file.arrayBuffer();const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(sha!==config.sha)throw Error('SHA-256 mismatch');
 const next=new Image();url=URL.createObjectURL(file);next.src=url;await next.decode();
 if(next.naturalWidth!==4320||next.naturalHeight!==3240)throw Error('Dimensions mismatch');
 if(ticket!==generation)return;image=next;index=0;byId('step').disabled=byId('play').disabled=false;
 byId('status').textContent='SHA-256 verified; ART NOT APPROVED';render();
 }catch(e){if(ticket===generation)byId('status').textContent=String(e)}finally{if(url)URL.revokeObjectURL(url)}};
byId('move').onchange=()=>{stop();index=0;render()};byId('left').onchange=render;
byId('step').onclick=()=>{stop();index=Math.min(5,index+1);render()};
byId('reset').onclick=()=>{generation++;stop();image=null;index=0;byId('file').value='';byId('step').disabled=byId('play').disabled=true;byId('status').textContent='No candidate loaded';byId('frame').textContent='';render()};
byId('play').onclick=()=>{if(playing){stop();return}index=0;elapsed=0;last=performance.now();playing=true;byId('play').textContent='Pause';render()};
function tick(now){if(playing&&image){elapsed+=(now-last)/1000*Number(byId('speed').value);
 const frames=config.clips[byId('move').value].frames;
 while(playing&&elapsed>=frames[index].duration){elapsed-=frames[index].duration;if(index===5)stop();else index++}render()}last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);
</script>'''.replace('CONFIG', json.dumps(config))


def write_review(root: Path, doc: dict) -> None:
    """Caller verifies candidate before building local-only visual evidence."""
    _write_contact_sheet(root, doc)
    (root / 'review.html').write_text(_review_html(doc), encoding='utf-8')
